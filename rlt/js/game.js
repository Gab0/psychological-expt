// Reverse Learning Task (RLT) - probabilistic reward with reversal
// Implements: 10-practice + 80 main trials, random left/right, mouse and arrows
// Outcome: if chosen target is currently the "correct" stimulus => +1 with 75%, else +1 with 25%
// Reversal: at main trial 41, which stimulus is designated as "correct" flips
// Timeout: no response within RESPONSE_TIMEOUT_MS => -1 and continue

import {
  PsyExpBaseConfig,
  fetchMessages,
  updateDatabase,
  getHighscores,
  getCookie,
  createRebootButton,
} from '../../psyexp_core.js';

// ---------------- Constants ----------------
const PRACTICE_TRIALS = 10;
const MAIN_TRIALS = 80;
const RESPONSE_TIMEOUT_MS = 3000; // per spec: take care of timeouts
const FEEDBACK_MS = 1200;
const PROB_CORRECT = 0.75;
const PROB_WRONG = 0.25;

// ---------------- Shared State ----------------
let messages = {};
try {
  const activeLang = getCookie('language') || 'en-us';
  messages = await fetchMessages(activeLang, 'rlt');
} catch (e) {
  console.log('RLT: message fetch failed, using defaults');
  messages = {};
}

// ---------------- Helpers ----------------
function computeReward(chosenIsDesignatedCorrect) {
  const p = chosenIsDesignatedCorrect ? PROB_CORRECT : PROB_WRONG;
  const win = Math.random() < p; // true => +1, false => -1
  return win ? 1 : -1;
}

function formatBriefing() {
  return (
    messages['BRIEFING'] ||
    [
      'Welcome to the Reverse Learning Task!',
      '',
      'You will see two shapes on the screen. One shape is designated as more likely to pay +1,',
      'while the other is less likely. Your goal is to learn which one is better, and adapt when it changes.',
      '',
      'Controls:',
      '• Click a shape',
      '• LEFT ARROW selects left shape',
      '• RIGHT ARROW selects right shape',
      '',
      'You will complete 10 practice rounds and then 80 game rounds.',
      'Your score starts at 0. Each round changes your score by +1 or -1.',
      '',
      'Click anywhere or press SPACEBAR to begin practice.',
    ].join('\n')
  );
}

// ---------------- Scenes ----------------
class InstructionsScene extends Phaser.Scene {
  constructor() { super({ key: 'InstructionsScene' }); }
  create() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    this.cameras.main.setBackgroundColor('#2c3e50');

    this.add.text(W * 0.5, H * 0.12, 'Reverse Learning Task', {
      fontSize: '48px',
      fill: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W * 0.5, H * 0.5, formatBriefing(), {
      fontSize: '22px',
      fill: '#ffffff',
      wordWrap: { width: W - 160 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    const startNext = () => this.scene.start('PracticeScene');
    const space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on('down', startNext);
    this.input.once('pointerdown', startNext);
  }
}

class BaseRLTScene extends Phaser.Scene {
  init(config) {
    // config: { totalTrials, withReversal }
    this.totalTrials = config.totalTrials;
    this.withReversal = !!config.withReversal;
  }
  constructor(key) {
    super({ key });
    this.currentTrial = 0;
    this.score = 0;
    this.results = [];

    // Two stimuli: A = blue square, B = red circle
    // Start: A is designated as correct (higher reward prob)
    this.stimuli = [
      { id: 'A', name: 'square', color: 0x3498db, designatedCorrect: true },
      { id: 'B', name: 'circle', color: 0xe74c3c, designatedCorrect: false },
    ];

    this.isAwaiting = false;
    this.trialStart = 0;
    this.timeoutEvent = null;
  }

  create() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    this.cameras.main.setBackgroundColor('#34495e');

    this.headerText = this.add.text(W * 0.5, H * 0.06, this.headerTitle(), {
      fontSize: '36px', fill: '#ecf0f1', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.trialText = this.add.text(W * 0.08, H * 0.1, '', { fontSize: '22px', fill: '#ffffff' });
    this.scoreText = this.add.text(W * 0.92, H * 0.1, '', { fontSize: '22px', fill: '#f1c40f' }).setOrigin(1, 0);
    this.feedbackText = this.add.text(W * 0.5, H * 0.82, '', { fontSize: '30px', fill: '#ffffff' }).setOrigin(0.5);

    this.leftG = this.add.graphics();
    this.rightG = this.add.graphics();

    // Interactive zones taking each half of the screen
    this.leftZone = this.add.zone(0, 0, W / 2, H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    this.rightZone = this.add.zone(W / 2, 0, W / 2, H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    this.leftZone.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      this.isAwaiting && this.onChoice('left');
    });

    this.rightZone.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      this.isAwaiting && this.onChoice('right');
    });

    this.leftZone.on('pointerover', () => {
      if (this.isAwaiting && this.leftG) this.leftG.setScale(1.08);
    });
    this.leftZone.on('pointerout', () => {
      if (this.leftG) this.leftG.setScale(1.0);
    });

    this.rightZone.on('pointerover', () => {
      if (this.isAwaiting && this.rightG) this.rightG.setScale(1.08);
    });
    this.rightZone.on('pointerout', () => {
      if (this.rightG) this.rightG.setScale(1.0);
    });

    this.setupControls();
    this.nextTrial();
  }

  headerTitle() { return 'Session'; }

  setupControls() {
    const leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    leftKey.on('down', () => this.isAwaiting && this.onChoice('left'));
    rightKey.on('down', () => this.isAwaiting && this.onChoice('right'));
  }

  nextTrial() {
    this.currentTrial += 1;
    this.isAwaiting = true;
    this.trialStart = this.time.now;

    // Reversal (only in main game): at midpoint or on average once per 10 trials
    if (this.withReversal && (this.currentTrial === Math.floor(this.totalTrials / 2) + 1 || (this.currentTrial > 1 && Math.random() < 0.1))) {
      this.stimuli[0].designatedCorrect = !this.stimuli[0].designatedCorrect;
      this.stimuli[1].designatedCorrect = !this.stimuli[1].designatedCorrect;
    }

    // UI
    this.trialText.setText(`Trial: ${this.currentTrial}/${this.totalTrials}`);
    this.scoreText.setText(`Score: ${this.score}`);
    this.feedbackText.setText('');

    // Randomize position
    const leftIdx = Math.random() < 0.5 ? 0 : 1;
    const rightIdx = 1 - leftIdx;
    this.leftData = this.stimuli[leftIdx];
    this.rightData = this.stimuli[rightIdx];

    this.drawStimuli();

    // Set up timeout
    if (this.timeoutEvent) this.timeoutEvent.remove(false);
    this.timeoutEvent = this.time.delayedCall(RESPONSE_TIMEOUT_MS, () => {
      if (!this.isAwaiting) return;
      this.isAwaiting = false;
      const rt = this.time.now - this.trialStart;
      const chosenSide = 'timeout';
      const chosenStim = null;
      const chosenIsDesignatedCorrect = false;
      const reward = -1; // per spec ensure +/- every round; timeout => -1
      this.score += reward;
      this.recordTrial({ chosenSide, chosenStim, chosenIsDesignatedCorrect, reward, rt });
      this.showFeedback(reward);
    });
  }

  drawStimuli() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    const size = 110;

    // Clear
    this.leftG.clear();
    this.rightG.clear();
    this.leftG.setScale(1.0);
    this.rightG.setScale(1.0);

    const leftPos = { x: W * 0.32, y: H * 0.55 };
    const rightPos = { x: W * 0.68, y: H * 0.55 };

    // Left
    this.leftG.fillStyle(this.leftData.color);
    if (this.leftData.name === 'circle') {
      this.leftG.fillCircle(0, 0, size / 2);
    } else {
      this.leftG.fillRect(-size / 2, -size / 2, size, size);
    }
    this.leftG.setPosition(leftPos.x, leftPos.y);

    // Right
    this.rightG.fillStyle(this.rightData.color);
    if (this.rightData.name === 'circle') {
      this.rightG.fillCircle(0, 0, size / 2);
    } else {
      this.rightG.fillRect(-size / 2, -size / 2, size, size);
    }
    this.rightG.setPosition(rightPos.x, rightPos.y);
  }

  onChoice(side) {
    if (!this.isAwaiting) return;
    this.isAwaiting = false;
    if (this.leftG) this.leftG.setScale(1.0);
    if (this.rightG) this.rightG.setScale(1.0);
    if (this.timeoutEvent) this.timeoutEvent.remove(false);

    const rt = this.time.now - this.trialStart;
    const chosenData = side === 'left' ? this.leftData : this.rightData;
    const chosenIsDesignatedCorrect = !!chosenData.designatedCorrect;

    const reward = computeReward(chosenIsDesignatedCorrect);
    this.score += reward;

    this.recordTrial({
      chosenSide: side,
      chosenStim: chosenData.id,
      chosenIsDesignatedCorrect,
      reward,
      rt,
    });

    this.showFeedback(reward);
  }

  recordTrial({ chosenSide, chosenStim, chosenIsDesignatedCorrect, reward, rt }) {
    const phase = this.withReversal && this.currentTrial > this.totalTrials / 2 ? 'reversal' : 'learning';
    this.results.push({
      trial: this.currentTrial,
      phase,
      chosenSide,
      chosenStim,
      chosenIsDesignatedCorrect,
      reward,
      score: this.score,
      rt,
      leftStim: this.leftData?.id ?? null,
      rightStim: this.rightData?.id ?? null,
    });
  }

  showFeedback(reward) {
    const text = reward > 0 ? '+1' : '-1';
    const color = reward > 0 ? '#2ecc71' : '#e74c3c';
    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.scoreText.setText(`Score: ${this.score}`);

    this.time.delayedCall(FEEDBACK_MS, () => {
      if (this.currentTrial >= this.totalTrials) {
        this.finish();
      } else {
        this.nextTrial();
      }
    });
  }

  async finish() {
    // Default just transitions; subclasses override
  }
}

class PracticeScene extends BaseRLTScene {
  constructor() { super('PracticeScene'); }
  headerTitle() { return 'Practice Session'; }
  init() { super.init({ totalTrials: PRACTICE_TRIALS, withReversal: false }); }
  async finish() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    this.children.each((c) => c.destroy());
    this.cameras.main.setBackgroundColor('#2c3e50');

    this.add.text(W * 0.5, H * 0.35, 'Practice Complete', { fontSize: '46px', fill: '#ffffff' }).setOrigin(0.5);
    this.add.text(W * 0.5, H * 0.52, `Practice Score: ${this.score}`, { fontSize: '26px', fill: '#f1c40f' }).setOrigin(0.5);
    this.add.text(W * 0.5, H * 0.72, 'Click anywhere or press SPACEBAR to start the main game', { fontSize: '22px', fill: '#ecf0f1' }).setOrigin(0.5);

    const startNext = () => this.scene.start('GameScene');
    const space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on('down', startNext);
    this.input.once('pointerdown', startNext);
  }
}

class GameScene extends BaseRLTScene {
  constructor() { super('GameScene'); }
  headerTitle() { return 'Main Game'; }
  init() { super.init({ totalTrials: MAIN_TRIALS, withReversal: true }); }

  async finish() {
    // Metrics
    const learning = this.results.filter(r => r.phase === 'learning');
    const reversal = this.results.filter(r => r.phase === 'reversal');

    const targetChoiceRate = (arr) => arr.length ? (arr.filter(r => r.chosenIsDesignatedCorrect).length / arr.length) * 100 : 0;
    const avgRT = this.results.length ? this.results.reduce((s, r) => s + r.rt, 0) / this.results.length : 0;

    const data = {
      final_score: this.score,
      total_trials: this.totalTrials,
      learning_target_choice_rate: targetChoiceRate(learning),
      reversal_target_choice_rate: targetChoiceRate(reversal),
      avg_reaction_time: avgRT,
      trial_data: this.results,
    };

    try { await updateDatabase(data, 'rlt'); } catch (e) { console.log('RLT save failed', e); }

    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    this.children.each((c) => c.destroy());
    this.cameras.main.setBackgroundColor('#2c3e50');

    const summary = [
      `Final Score: ${this.score}`,
      `Learning Target Choice: ${data.learning_target_choice_rate.toFixed(1)}%`,
      `Reversal Target Choice: ${data.reversal_target_choice_rate.toFixed(1)}%`,
      `Average RT: ${avgRT.toFixed(0)}ms`,
      '',
      'Click anywhere or press SPACEBAR to view High Scores',
    ].join('\n');

    this.add.text(W * 0.5, H * 0.18, 'Game Complete!', { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
    this.add.text(W * 0.5, H * 0.55, summary, { fontSize: '22px', fill: '#ecf0f1', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    const showScores = async () => {
      await this.showHighscores();
    };
    const space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on('down', showScores);
    this.input.once('pointerdown', showScores);
  }

  async showHighscores() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    this.children.each((c) => c.destroy());
    this.cameras.main.setBackgroundColor('#2c3e50');

    this.add.text(W * 0.5, H * 0.1, 'High Scores', { fontSize: '36px', fill: '#ffffff' }).setOrigin(0.5);

    let scores = [];
    try { scores = await getHighscores('rlt', 'final_score', false); } catch (e) { console.log('RLT highscores failed', e); }

    // Headers
    this.add.text(W * 0.2, H * 0.2, 'Rank', { fontSize: '22px', fill: '#ffffff' });
    this.add.text(W * 0.4, H * 0.2, 'Name', { fontSize: '22px', fill: '#ffffff' });
    this.add.text(W * 0.6, H * 0.2, 'Score', { fontSize: '22px', fill: '#ffffff' });
    this.add.text(W * 0.8, H * 0.2, 'Target %', { fontSize: '22px', fill: '#ffffff' });

    let y = H * 0.28;
    (scores || []).slice(0, 10).forEach((row, idx) => {
      const name = row.nickname || 'Anonymous';
      const score = row.final_score ?? 0;
      const targetPct = (row.learning_target_choice_rate ?? 0).toFixed(1);
      this.add.text(W * 0.2, y, `${idx + 1}.`, { fontSize: '20px', fill: '#ffffff' });
      this.add.text(W * 0.4, y, name, { fontSize: '20px', fill: '#ffffff' });
      this.add.text(W * 0.6, y, `${score}`, { fontSize: '20px', fill: '#ffffff' });
      this.add.text(W * 0.8, y, `${targetPct}%`, { fontSize: '20px', fill: '#ffffff' });
      y += H * 0.045;
    });

    createRebootButton(this, W * 0.5, H * 0.88, () => {
      this.currentTrial = 0;
      this.score = 0;
      this.results = [];
      this.scene.start('InstructionsScene');
    });
  }
}

// ---------------- Game Bootstrap ----------------
const baseConfig = PsyExpBaseConfig([InstructionsScene, PracticeScene, GameScene]);
const config = { ...baseConfig, parent: 'game-root' };
new Phaser.Game(config);
