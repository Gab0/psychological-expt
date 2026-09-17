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
  messageMap = await fetchMessages(activeLang, 'cdt') || {};
} catch (e) {
  console.log('CDT message fetch failed');
}

class CDTScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CDTScene' });
    this.totalTrials = 15;
    this.currentTrial = 0;
    this.numItems = 6;
    this.colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
  }

  create() {
    this.userResults = [];
    this.currentTrial = 0;
    this.isResponding = false;

    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.statusText = this.add.text(W * 0.5, H * 0.1, '', { fontSize: '36px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.trialText = this.add.text(W * 0.08, H * 0.06, '', { fontSize: '24px', fill: '#ffffff' });
    this.feedbackText = this.add.text(W * 0.5, H * 0.85, '', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);

    // On-screen response buttons
    this.yesButton = this.add.rectangle(W * 0.35, H * 0.75, 180, 70, 0x2ecc71).setInteractive().setOrigin(0.5);
    this.yesText = this.add.text(W * 0.35, H * 0.75, 'YES (Y)', { fontSize: '28px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.yesButton.on('pointerdown', () => this.detectChange(true));

    this.noButton = this.add.rectangle(W * 0.65, H * 0.75, 180, 70, 0xe74c3c).setInteractive().setOrigin(0.5);
    this.noText = this.add.text(W * 0.65, H * 0.75, 'NO (N)', { fontSize: '28px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.noButton.on('pointerdown', () => this.detectChange(false));

    this.setButtonsVisible(false);

    // Keyboard handlers
    this.input.keyboard.on('keydown-Y', () => this.isResponding && this.detectChange(true));
    this.input.keyboard.on('keydown-N', () => this.isResponding && this.detectChange(false));
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.isResponding && this.currentTrial === 0) {
        this.startTrial();
      }
    });

    this.startTrial();
  }

  setButtonsVisible(visible) {
    this.yesButton.setVisible(visible);
    this.yesText.setVisible(visible);
    this.noButton.setVisible(visible);
    this.noText.setVisible(visible);
  }

  startTrial() {
    if (this.currentTrial >= this.totalTrials) {
      this.finishExperiment();
      return;
    }

    this.currentTrial++;
    this.trialText.setText(`Trial: ${this.currentTrial}/${this.totalTrials}`);
    this.statusText.setText(messageMap['MEMORIZE_MSG'] || 'Memorize the items...');
    this.feedbackText.setText('');
    this.setButtonsVisible(false);
    this.isResponding = false;

    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    // Clear previous items
    if (this.itemGraphics) {
      this.itemGraphics.forEach(g => g.destroy());
    }
    this.itemGraphics = [];

    // Generate random items (positions & colors)
    this.itemsData = [];
    for (let i = 0; i < this.numItems; i++) {
      let x, y, overlap;
      do {
        overlap = false;
        x = Phaser.Math.Between(W * 0.2, W * 0.8);
        y = Phaser.Math.Between(H * 0.25, H * 0.65);
        for (let item of this.itemsData) {
          if (Phaser.Math.Distance.Between(item.x, item.y, x, y) < 80) {
            overlap = true;
            break;
          }
        }
      } while (overlap);

      const color = this.colors[Phaser.Math.Between(0, this.colors.length - 1)];
      this.itemsData.push({ x, y, color });
      
      const circle = this.add.circle(x, y, 30, color);
      circle.setStrokeStyle(3, 0xffffff);
      this.itemGraphics.push(circle);
    }

    // Display memory array for 1000ms, then retention interval (900ms), then test array
    this.time.delayedCall(1000, () => {
      this.itemGraphics.forEach(g => g.setVisible(false));
      this.statusText.setText('');

      this.time.delayedCall(900, () => {
        this.presentTestArray();
      });
    });
  }

  presentTestArray() {
    this.changeMade = Math.random() < 0.5;
    this.changedIndex = -1;

    if (this.changeMade) {
      this.changedIndex = Phaser.Math.Between(0, this.numItems - 1);
      let newColor;
      do {
        newColor = this.colors[Phaser.Math.Between(0, this.colors.length - 1)];
      } while (newColor === this.itemsData[this.changedIndex].color);

      this.testItemsData = JSON.parse(JSON.stringify(this.itemsData));
      this.testItemsData[this.changedIndex].color = newColor;
    } else {
      this.testItemsData = JSON.parse(JSON.stringify(this.itemsData));
    }

    // Draw test array
    this.itemGraphics.forEach(g => g.destroy());
    this.itemGraphics = [];

    this.testItemsData.forEach(item => {
      const circle = this.add.circle(item.x, item.y, 30, item.color);
      circle.setStrokeStyle(3, 0xffffff);
      this.itemGraphics.push(circle);
    });

    this.statusText.setText(messageMap['DETECT_MSG'] || 'Did any item change color?');
    this.setButtonsVisible(true);
    this.isResponding = true;
    this.startTime = this.time.now;
  }

  detectChange(userDetectedChange) {
    if (!this.isResponding) return;
    this.isResponding = false;
    const rt = this.time.now - this.startTime;

    const isCorrect = (userDetectedChange === this.changeMade);
    const feedback = isCorrect ? '✓ Correct!' : '✗ Incorrect';
    const color = isCorrect ? '#2ecc71' : '#e74c3c';

    this.feedbackText.setText(feedback).setColor(color);

    this.userResults.push({
      trial: this.currentTrial,
      changeMade: this.changeMade,
      userDetectedChange: userDetectedChange,
      isCorrect: isCorrect,
      rt: rt
    });

    this.time.delayedCall(1200, () => {
      this.startTrial();
    });
  }

  async finishExperiment() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.itemGraphics.forEach(g => g.destroy());
    this.setButtonsVisible(false);
    this.statusText.setText('');
    this.trialText.setText('');
    this.feedbackText.setText('');

    const correctCount = this.userResults.filter(r => r.isCorrect).length;
    const accuracy = correctCount / this.totalTrials;
    const avgRT = this.userResults.reduce((acc, r) => acc + r.rt, 0) / this.totalTrials;

    const payload = {
      totalTrials: this.totalTrials,
      correctCount: correctCount,
      accuracy: accuracy,
      avgRT: avgRT,
      results: this.userResults
    };

    await updateDatabase(payload, 'cdt');

    this.add.text(W * 0.5, H * 0.25, 'Task Complete!', { fontSize: '48px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W * 0.5, H * 0.45, `Accuracy: ${(accuracy * 100).toFixed(1)}% (${correctCount}/${this.totalTrials})\nAverage RT: ${avgRT.toFixed(0)} ms`, {
      fontSize: '28px',
      fill: '#ecf0f1',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);

    this.add.text(W * 0.5, H * 0.75, 'Click anywhere or press SPACEBAR to view High Scores', { fontSize: '22px', fill: '#ffff00' }).setOrigin(0.5);

    const showScores = () => this.showHighscores();
    this.input.keyboard.once('keydown-SPACE', showScores);
    this.input.once('pointerdown', showScores);
  }

  async showHighscores() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.children.each(c => c.destroy());
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.add.text(W * 0.5, H * 0.12, 'High Scores', { fontSize: '42px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    let scores = [];
    try {
      scores = await getHighscores('cdt', 'experiment_payload->>accuracy', false);
    } catch (e) {
      console.log('CDT highscores fetch failed', e);
    }

    this.add.text(W * 0.2, H * 0.22, 'Rank', { fontSize: '24px', fill: '#ffff00' });
    this.add.text(W * 0.4, H * 0.22, 'Name', { fontSize: '24px', fill: '#ffff00' });
    this.add.text(W * 0.7, H * 0.22, 'Accuracy', { fontSize: '24px', fill: '#ffff00' });

    let y = H * 0.3;
    (scores || []).slice(0, 10).forEach((row, idx) => {
      const name = row.nickname || 'Anonymous';
      const accuracy = ((row.experiment_payload?.accuracy || 0) * 100).toFixed(0);
      this.add.text(W * 0.2, y, `${idx + 1}.`, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.4, y, name, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.7, y, `${accuracy}%`, { fontSize: '22px', fill: '#ffffff' });
      y += H * 0.05;
    });

    createRebootButton(this, W * 0.5, H * 0.9, () => {
      this.currentTrial = 0;
      this.userResults = [];
      this.scene.start('BriefingScene');
    });
  }
}

const defaultBriefing = [
  messageMap["BRIEFING_1"] || "Change Detection Task (CDT)",
  messageMap["BRIEFING_2"] || "A set of colored circles will appear briefly on the screen.\nMemorize their colors and positions.\n\nAfter a brief pause, decide if ANY circle changed its color.\n\nControls:\n• Click YES (Y) or NO (N) on screen\n• Press 'Y' for Yes, 'N' for No\n\nClick or press SPACEBAR to begin."
];

const briefing = new StandardBriefingScene(
  'Change Detection Task',
  defaultBriefing,
  'BriefingScene',
  'CDTScene'
);

const config = PsyExpBaseConfig([briefing, CDTScene]);
const game = new Phaser.Game(config);
