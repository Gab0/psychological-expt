import {
  PsyExpBaseConfig,
  StandardBriefingScene,
  fetchMessages,
  updateDatabase,
  getHighscores,
  getCookie,
  font, createRebootButton
} from '../../psyexp_core.js';

const activeLang = getCookie('language') || 'en-us';
let messageMap = {};
try {
  messageMap = await fetchMessages(activeLang, 'sdst') || {};
} catch (e) {
  console.log('SDST message fetch failed');
}

class SDSTScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SDSTScene' });
    this.symbols = ['@', '#', '$', '%', '&', '*', '(', ')'];
    this.digits = ['1', '2', '3', '4', '5', '6', '7', '8'];
    this.testDuration = 90; // 90 seconds
  }

  create() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#2c3e50');

    this.score = 0;
    this.attempted = 0;
    this.timeLeft = this.testDuration;
    this.userInput = '';
    this.isTestRunning = false;

    // Title
    this.add.text(W * 0.5, H * 0.08, 'Symbol Digit Substitution Test', { fontSize: '38px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    // Create symbol-digit pairs
    this.symbolDigitPairs = this.createSymbolDigitPairs();

    // Key display box (top of screen)
    const keyBox = this.add.rectangle(W * 0.5, H * 0.2, W * 0.85, 90, 0x34495e).setOrigin(0.5);
    keyBox.setStrokeStyle(3, 0xecf0f1);

    this.renderKeyDisplay(W, H);

    // Problem display
    this.problemText = this.add.text(W * 0.5, H * 0.38, '', { fontSize: '48px', fill: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);

    // User input display
    this.inputText = this.add.text(W * 0.5, H * 0.48, 'Your input: ', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);

    // Score & Timer displays
    this.scoreText = this.add.text(W * 0.15, H * 0.9, 'Score: 0', { fontSize: '28px', fill: '#2ecc71', fontStyle: 'bold' });
    this.timerText = this.add.text(W * 0.85, H * 0.9, 'Time: 90s', { fontSize: '28px', fill: '#e74c3c', fontStyle: 'bold' }).setOrigin(1, 0);

    // On-screen keypad for mouse/touch
    this.createKeypad(W, H);

    // Keyboard handlers
    this.input.keyboard.on('keydown', (e) => this.handleKeyInput(e));

    this.startTest();
  }

  createSymbolDigitPairs() {
    let shuffledDigits = Phaser.Utils.Array.Shuffle(this.digits.slice());
    return this.symbols.map((symbol, index) => ({ symbol: symbol, digit: shuffledDigits[index] }));
  }

  renderKeyDisplay(W, H) {
    const startX = W * 0.12;
    const spacing = W * 0.1;
    this.symbolDigitPairs.forEach((pair, idx) => {
      const x = startX + idx * spacing;
      this.add.text(x, H * 0.17, pair.symbol, { fontSize: '32px', fill: '#f39c12', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(x, H * 0.23, pair.digit, { fontSize: '28px', fill: '#ffffff' }).setOrigin(0.5);
    });
  }

  createKeypad(W, H) {
    const startX = W * 0.25;
    const startY = H * 0.62;
    const btnW = 90;
    const btnH = 65;
    const gap = 15;

    const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', 'C', '⌫'];

    numKeys.forEach((key, idx) => {
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      const x = startX + col * (btnW + gap);
      const y = startY + row * (btnH + gap);

      const btn = this.add.rectangle(x, y, btnW, btnH, 0x34495e).setInteractive().setOrigin(0.5);
      btn.setStrokeStyle(2, 0xbdc3c7);

      this.add.text(x, y, key, { fontSize: '28px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        btn.setFillStyle(0x7f8c8d);
        this.time.delayedCall(100, () => btn.setFillStyle(0x34495e));
        this.processKey(key);
      });
    });
  }

  startTest() {
    this.isTestRunning = true;
    this.score = 0;
    this.attempted = 0;
    this.timeLeft = this.testDuration;
    this.generateProblem();

    // 1-second timer event
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isTestRunning) return;
        this.timeLeft--;
        this.timerText.setText(`Time: ${this.timeLeft}s`);
        if (this.timeLeft <= 0) {
          this.endTest();
        }
      },
      loop: true
    });
  }

  generateProblem() {
    this.currentProblem = Phaser.Utils.Array.Shuffle(this.symbolDigitPairs.slice()).slice(0, 3);
    let problemString = this.currentProblem.map(pair => pair.symbol).join('   ');
    this.problemText.setText(problemString);
    this.userInput = '';
    this.inputText.setText('Your input: ');
  }

  processKey(key) {
    if (!this.isTestRunning) return;

    if (key === 'C') {
      this.userInput = '';
      this.inputText.setText('Your input: ');
      return;
    }

    if (key === '⌫') {
      this.userInput = this.userInput.slice(0, -1);
      this.inputText.setText('Your input: ' + this.userInput);
      return;
    }

    if (this.digits.includes(key)) {
      this.userInput += key;
      this.inputText.setText('Your input: ' + this.userInput);

      if (this.userInput.length === 3) {
        this.checkAnswer();
      }
    }
  }

  handleKeyInput(event) {
    if (!this.isTestRunning) return;
    if (this.digits.includes(event.key)) {
      this.processKey(event.key);
    } else if (event.key === 'Backspace') {
      this.processKey('⌫');
    }
  }

  checkAnswer() {
    this.attempted++;
    let correct = this.currentProblem.every((pair, index) => pair.digit === this.userInput[index]);
    if (correct) {
      this.score++;
      this.scoreText.setText(`Score: ${this.score}`);
    }
    this.generateProblem();
  }

  async endTest() {
    this.isTestRunning = false;
    if (this.timerEvent) this.timerEvent.remove(false);

    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    const accuracy = this.attempted > 0 ? (this.score / this.attempted) : 0;
    const payload = {
      score: this.score,
      attempted: this.attempted,
      accuracy: accuracy,
      duration: this.testDuration
    };

    await updateDatabase(payload, 'sdst');

    this.children.each(c => c.destroy());
    this.cameras.main.setBackgroundColor('#2c3e50');

    this.add.text(W * 0.5, H * 0.25, 'Test Complete!', { fontSize: '48px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W * 0.5, H * 0.45, `Final Score: ${this.score}\nTotal Attempted: ${this.attempted}\nAccuracy: ${(accuracy * 100).toFixed(1)}%`, {
      fontSize: '28px',
      fill: '#ecf0f1',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);

    this.add.text(W * 0.5, H * 0.75, 'Click anywhere or press SPACEBAR to view High Scores', { fontSize: '22px', fill: '#f1c40f' }).setOrigin(0.5);

    const showScores = () => this.showHighscores();
    this.input.keyboard.once('keydown-SPACE', showScores);
    this.input.once('pointerdown', showScores);
  }

  async showHighscores() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    this.children.each(c => c.destroy());
    this.cameras.main.setBackgroundColor('#2c3e50');

    this.add.text(W * 0.5, H * 0.12, 'High Scores', { fontSize: '42px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    let scores = [];
    try {
      scores = await getHighscores('sdst', 'experiment_payload->>score', false);
    } catch (e) {
      console.log('SDST highscores fetch failed', e);
    }

    this.add.text(W * 0.2, H * 0.22, 'Rank', { fontSize: '24px', fill: '#f1c40f' });
    this.add.text(W * 0.4, H * 0.22, 'Name', { fontSize: '24px', fill: '#f1c40f' });
    this.add.text(W * 0.7, H * 0.22, 'Score', { fontSize: '24px', fill: '#f1c40f' });

    let y = H * 0.3;
    (scores || []).slice(0, 10).forEach((row, idx) => {
      const name = row.nickname || 'Anonymous';
      const score = row.experiment_payload?.score ?? 0;
      this.add.text(W * 0.2, y, `${idx + 1}.`, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.4, y, name, { fontSize: '22px', fill: '#ffffff' });
      this.add.text(W * 0.7, y, `${score}`, { fontSize: '22px', fill: '#ffffff' });
      y += H * 0.05;
    });

    const restart = () => this.scene.start('BriefingScene');
    this.add.text(W * 0.5, H * 0.9, 'Click anywhere or press R to play again', { fontSize: '20px', fill: '#cccccc' }).setOrigin(0.5);
    this.input.keyboard.once('keydown-R', restart);
    this.input.once('pointerdown', restart);
  }
}

const defaultBriefing = [
  messageMap["BRIEFING_1"] || "Symbol-Digit Substitution Test (SDST)",
  messageMap["BRIEFING_2"] || "Match symbols to their corresponding digits as quickly as possible.\n\nUse the reference key at top to enter the correct digits.\n\nControls:\n• On-screen numeric keypad (1-8)\n• Keyboard number keys (1-8)\n\nYou will have 90 seconds.\n\nClick or press SPACEBAR to begin."
];

const briefing = new StandardBriefingScene(
  'Symbol Digit Substitution Test',
  defaultBriefing,
  'BriefingScene',
  'SDSTScene'
);

const config = PsyExpBaseConfig([briefing, SDSTScene]);
const game = new Phaser.Game(config);
