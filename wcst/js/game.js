import {
  PsyExpBaseConfig,
  StandardBriefingScene,
  fetchMessages,
  updateDatabase,
  getHighscores,
  getCookie,
  font,
  createRebootButton
} from '../../psyexp_core.js';

const activeLang = getCookie('language') || 'en-us';
let messageMap = {};
try {
  messageMap = await fetchMessages(activeLang, 'wcst') || {};
} catch (e) {
  console.log('WCST message fetch failed');
}

// Fixed Target Deck Definitions for Standard WCST
const TARGET_CARDS = [
  { id: 1, color: 'red', shape: 'triangle', count: 1, colorHex: 0xe74c3c },
  { id: 2, color: 'green', shape: 'star', count: 2, colorHex: 0x2ecc71 },
  { id: 3, color: 'yellow', shape: 'cross', count: 3, colorHex: 0xf1c40f },
  { id: 4, color: 'blue', shape: 'circle', count: 4, colorHex: 0x3498db }
];

const COLORS = [
  { name: 'red', hex: 0xe74c3c },
  { name: 'green', hex: 0x2ecc71 },
  { name: 'yellow', hex: 0xf1c40f },
  { name: 'blue', hex: 0x3498db }
];

const SHAPES = ['triangle', 'star', 'cross', 'circle'];
const COUNTS = [1, 2, 3, 4];
const RULES = ['color', 'shape', 'count'];

class WCSTScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WCSTScene' });
    this.maxTrials = 64;
  }

  create() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#1e272e');

    this.trialCount = 0;
    this.consecutiveCorrect = 0;
    this.ruleIndex = 0; // Starts at 'color'
    this.currentRule = RULES[this.ruleIndex];
    this.previousRule = null;
    this.categoriesCompleted = 0;
    this.totalErrors = 0;
    this.perseverativeErrors = 0;
    this.userResults = [];
    this.isResponding = false;

    // Header & Info Text
    this.add.text(W * 0.5, H * 0.06, 'Wisconsin Card Sorting Test', { fontSize: '38px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.trialText = this.add.text(W * 0.08, H * 0.06, `Trial: 0/${this.maxTrials}`, { fontSize: '24px', fill: '#dcdde1' });
    this.feedbackText = this.add.text(W * 0.5, H * 0.52, '', { fontSize: '36px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    // Target Deck Cards Container (Top Row)
    this.targetCardContainers = [];
    const targetX = [W * 0.2, W * 0.4, W * 0.6, W * 0.8];
    const targetY = H * 0.26;

    TARGET_CARDS.forEach((cardDef, idx) => {
      const container = this.createCardContainer(targetX[idx], targetY, 160, 210, cardDef);
      container.setInteractive(new Phaser.Geom.Rectangle(-80, -105, 160, 210), Phaser.Geom.Rectangle.Contains);
      
      // Label 1-4 for keyboard reference
      this.add.text(targetX[idx], targetY - 125, `[ ${idx + 1} ]`, { fontSize: '22px', fill: '#fbc531', fontStyle: 'bold' }).setOrigin(0.5);

      container.on('pointerdown', () => this.isResponding && this.onCardSelected(idx + 1));
      this.targetCardContainers.push(container);
    });

    // Response Deck Card Container (Bottom Center)
    this.responseCardY = H * 0.72;
    this.responseCardX = W * 0.5;

    this.add.text(W * 0.5, H * 0.92, 'Match the card below to one of the four target cards above (Click 1-4 or press keys 1-4)', { fontSize: '20px', fill: '#7f8c8d' }).setOrigin(0.5);

    // Keyboard handlers (Keys 1-4)
    this.input.keyboard.on('keydown-ONE', () => this.isResponding && this.onCardSelected(1));
    this.input.keyboard.on('keydown-TWO', () => this.isResponding && this.onCardSelected(2));
    this.input.keyboard.on('keydown-THREE', () => this.isResponding && this.onCardSelected(3));
    this.input.keyboard.on('keydown-FOUR', () => this.isResponding && this.onCardSelected(4));

    this.nextTrial();
  }

  createCardContainer(x, y, width, height, cardDef) {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0.5);
    bg.setStrokeStyle(3, 0x2c3e50);
    container.add(bg);

    // Draw procedural shapes
    this.drawCardSymbols(container, cardDef);
    return container;
  }

  drawCardSymbols(container, cardDef) {
    const count = cardDef.count;
    const colorHex = cardDef.colorHex;
    const shape = cardDef.shape;

    // Position grid inside card
    const positions = {
      1: [{ x: 0, y: 0 }],
      2: [{ x: 0, y: -45 }, { x: 0, y: 45 }],
      3: [{ x: 0, y: -50 }, { x: 0, y: 0 }, { x: 0, y: 50 }],
      4: [{ x: -35, y: -45 }, { x: 35, y: -45 }, { x: -35, y: 45 }, { x: 35, y: 45 }]
    };

    const symbolPos = positions[count] || [{ x: 0, y: 0 }];

    symbolPos.forEach(pos => {
      const g = this.add.graphics();
      g.fillStyle(colorHex, 1);
      g.lineStyle(2, 0x000000, 0.5);

      const size = 22;

      if (shape === 'circle') {
        g.fillCircle(pos.x, pos.y, size);
        g.strokeCircle(pos.x, pos.y, size);
      } else if (shape === 'triangle') {
        g.beginPath();
        g.moveTo(pos.x, pos.y - size);
        g.lineTo(pos.x + size, pos.y + size);
        g.lineTo(pos.x - size, pos.y + size);
        g.closePath();
        g.fillPath();
        g.strokePath();
      } else if (shape === 'cross') {
        g.fillRect(pos.x - size, pos.y - size / 3, size * 2, size * 2 / 3);
        g.fillRect(pos.x - size / 3, pos.y - size, size * 2 / 3, size * 2);
        g.strokeRect(pos.x - size, pos.y - size / 3, size * 2, size * 2 / 3);
        g.strokeRect(pos.x - size / 3, pos.y - size, size * 2 / 3, size * 2);
      } else if (shape === 'star') {
        // Draw 5-pointed star
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          g.lineTo(pos.x + size * Math.cos((18 + i * 72) * Math.PI / 180), pos.y - size * Math.sin((18 + i * 72) * Math.PI / 180));
          g.lineTo(pos.x + (size / 2) * Math.cos((54 + i * 72) * Math.PI / 180), pos.y - (size / 2) * Math.sin((54 + i * 72) * Math.PI / 180));
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
      }

      container.add(g);
    });
  }

  nextTrial() {
    if (this.trialCount >= this.maxTrials) {
      this.finishExperiment();
      return;
    }

    this.trialCount++;
    this.trialText.setText(`Trial: ${this.trialCount}/${this.maxTrials}`);
    this.feedbackText.setText('');

    // Generate random response card definition
    const colorObj = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
    const shape = SHAPES[Phaser.Math.Between(0, SHAPES.length - 1)];
    const count = COUNTS[Phaser.Math.Between(0, COUNTS.length - 1)];

    this.currentResponseCard = {
      color: colorObj.name,
      colorHex: colorObj.hex,
      shape: shape,
      count: count
    };

    if (this.responseContainer) {
      this.responseContainer.destroy();
    }

    this.responseContainer = this.createCardContainer(this.responseCardX, this.responseCardY, 160, 210, this.currentResponseCard);
    this.isResponding = true;
    this.startTime = this.time.now;
  }

  onCardSelected(targetIndex) {
    if (!this.isResponding) return;
    this.isResponding = false;

    const rt = this.time.now - this.startTime;
    const targetCard = TARGET_CARDS[targetIndex - 1];

    // Check if match satisfies current hidden rule
    const isCorrect = (this.currentResponseCard[this.currentRule] === targetCard[this.currentRule]);

    // Check perseverative error (matching previous rule after shift)
    let isPerseverative = false;
    if (!isCorrect && this.previousRule && (this.currentResponseCard[this.previousRule] === targetCard[this.previousRule])) {
      isPerseverative = true;
      this.perseverativeErrors++;
    }

    if (isCorrect) {
      this.consecutiveCorrect++;
      this.feedbackText.setText('✓ Correct!').setColor('#2ecc71');

      if (this.consecutiveCorrect >= 10) {
        // Shift rule
        this.categoriesCompleted++;
        this.previousRule = this.currentRule;
        this.ruleIndex = (this.ruleIndex + 1) % RULES.length;
        this.currentRule = RULES[this.ruleIndex];
        this.consecutiveCorrect = 0;
      }
    } else {
      this.totalErrors++;
      this.consecutiveCorrect = 0;
      this.feedbackText.setText('✗ Incorrect').setColor('#e74c3c');
    }

    this.userResults.push({
      trial: this.trialCount,
      activeRule: this.currentRule,
      selectedTarget: targetIndex,
      isCorrect: isCorrect,
      isPerseverative: isPerseverative,
      rt: rt
    });

    this.time.delayedCall(1000, () => {
      this.nextTrial();
    });
  }

  async finishExperiment() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.children.each(c => c.destroy());
    this.cameras.main.setBackgroundColor('#1e272e');

    const accuracy = this.trialCount > 0 ? ((this.trialCount - this.totalErrors) / this.trialCount) : 0;

    const payload = {
      totalTrials: this.trialCount,
      categoriesCompleted: this.categoriesCompleted,
      totalErrors: this.totalErrors,
      perseverativeErrors: this.perseverativeErrors,
      accuracy: accuracy,
      results: this.userResults
    };

    await updateDatabase(payload, 'wcst');

    this.add.text(W * 0.5, H * 0.2, 'Test Complete!', { fontSize: '48px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const summaryText = [
      `Categories Completed: ${this.categoriesCompleted}`,
      `Total Trials: ${this.trialCount}`,
      `Total Errors: ${this.totalErrors}`,
      `Perseverative Errors: ${this.perseverativeErrors}`,
      `Overall Accuracy: ${(accuracy * 100).toFixed(1)}%`
    ].join('\n');

    this.add.text(W * 0.5, H * 0.5, summaryText, {
      fontSize: '28px',
      fill: '#f5f6fa',
      align: 'center',
      lineSpacing: 12
    }).setOrigin(0.5);

    this.add.text(W * 0.5, H * 0.8, 'Click anywhere or press SPACEBAR to view High Scores', { fontSize: '22px', fill: '#fbc531' }).setOrigin(0.5);

    const showScores = () => this.showHighscores();
    this.input.keyboard.once('keydown-SPACE', showScores);
    this.input.once('pointerdown', showScores);
  }

  async showHighscores() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.children.each(c => c.destroy());
    this.cameras.main.setBackgroundColor('#1e272e');

    this.add.text(W * 0.5, H * 0.12, 'High Scores', { fontSize: '42px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    let scores = [];
    try {
      scores = await getHighscores('wcst', 'experiment_payload->>categoriesCompleted', false);
    } catch (e) {
      console.log('WCST highscores fetch failed', e);
    }

    this.add.text(W * 0.15, H * 0.22, 'Rank', { fontSize: '24px', fill: '#fbc531' });
    this.add.text(W * 0.35, H * 0.22, 'Name', { fontSize: '24px', fill: '#fbc531' });
    this.add.text(W * 0.65, H * 0.22, 'Categories', { fontSize: '24px', fill: '#fbc531' });
    this.add.text(W * 0.82, H * 0.22, 'Errors', { fontSize: '24px', fill: '#fbc531' });

    let y = H * 0.3;
    (scores || []).slice(0, 10).forEach((row, idx) => {
      const name = row.nickname || 'Anonymous';
      const cat = row.experiment_payload?.categoriesCompleted ?? 0;
      const err = row.experiment_payload?.totalErrors ?? 0;

      this.add.text(W * 0.15, y, `${idx + 1}.`, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.35, y, name, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.65, y, `${cat}`, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.82, y, `${err}`, { fontSize: '22px', fill: '#ffffff' });
      y += H * 0.05;
    });

    const restart = () => {
  // Reset WCST state variables
  this.trialCount = 0;
  this.totalErrors = 0;
  this.perseverativeErrors = 0;
  this.categoriesCompleted = 0;
  this.userResults = [];
  this.scene.start('BriefingScene');
};
this.add.text(W * 0.5, H * 0.9, 'Click anywhere or press R to play again', { fontSize: '20px', fill: '#cccccc' }).setOrigin(0.5);
this.input.keyboard.once('keydown-R', restart);
this.input.once('pointerdown', restart);
// Add standardized reboot button
createRebootButton(this, W * 0.5, H * 0.95, restart);
  }
}

const defaultBriefing = [
  messageMap["BRIEFING_1"] || "Wisconsin Card Sorting Test (WCST)",
  messageMap["BRIEFING_2"] || "Match the bottom response card to one of the four target cards at the top.\n\nThe sorting rule is not told to you. Deduce the active rule from the feedback (Correct / Incorrect).\n\nRules may change periodically!\n\nControls:\n• Click any of the 4 target cards\n• Press keys 1, 2, 3, or 4\n\nClick or press SPACEBAR to begin."
];

const briefing = new StandardBriefingScene(
  'Wisconsin Card Sorting Test',
  defaultBriefing,
  'BriefingScene',
  'WCSTScene'
);

const config = PsyExpBaseConfig([briefing, WCSTScene]);
const game = new Phaser.Game(config);
