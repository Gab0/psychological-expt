import {
  PsyExpBaseConfig,
  StandardBriefingScene,
  db,
  makeid,
  nickname,
  fetchMessages,
  font,
  updateDatabase,
  getHighscores,
  getCookie,
  createRebootButton
} from '../../psyexp_core.js';

const activeLang = getCookie('language') || 'en-us';
let messageMap = {};
try {
  messageMap = await fetchMessages(activeLang, "srtt") || {};
} catch (e) {
  console.log("SRTT: message fetch failed");
}

class SRTTScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SRTTScene' });
  }

  init() {
    const stimulus = [0, 1, 2, 3];
    this.sequence = Array.from(Array(20)).map(() => stimulus[Math.floor(Math.random() * stimulus.length)]);
    this.currentStep = 0;

    const sX = [W * 0.25, W * 0.75];
    const sY = [H * 0.25, H * 0.75];

    this.stimulusPositions = [
      { x: sX[0], y: sY[0] }, // Top-left (I)
      { x: sX[1], y: sY[0] }, // Top-right (O)
      { x: sX[0], y: sY[1] }, // Bottom-left (K)
      { x: sX[1], y: sY[1] }  // Bottom-right (L)
    ];
    this.stimulusSize = W * 0.25;
    this.reactionTimes = [];
    this.inputModes = [];
  }

  create() {
    this.createMarkers();
    this.input.keyboard.on('keydown', this.handleInput, this);
    this.nextStimulus();
  }

  createMarkers() {
    for (let pos of this.stimulusPositions) {
      this.add.rectangle(pos.x, pos.y, this.stimulusSize, this.stimulusSize, 0xffffff);
    }
  }

  nextStimulus() {
    if (this.currentStep < this.sequence.length) {
      this.currentStimulusIndex = this.sequence[this.currentStep];
      this.currentStimulus = this.add.rectangle(
        this.stimulusPositions[this.currentStimulusIndex].x,
        this.stimulusPositions[this.currentStimulusIndex].y,
        this.stimulusSize,
        this.stimulusSize,
        0xff0000
      );

      this.currentStimulus.setInteractive();
      this.currentStimulus.on('pointerdown', () => this.computeStimulus("mouse"));
      this.stimulusStartTime = new Date().getTime();
    } else {
      this.endExperiment();
    }
  }

  handleInput(event) {
    if (!this.currentStimulus) return;

    let keyMap = {
      'i': 0, 'I': 0,
      'o': 1, 'O': 1,
      'k': 2, 'K': 2,
      'l': 3, 'L': 3
    };

    if (event.key in keyMap && keyMap[event.key] === this.currentStimulusIndex) {
      this.computeStimulus("keyboard");
    }
  }

  computeStimulus(mode) {
    const reactionTime = new Date().getTime() - this.stimulusStartTime;
    this.reactionTimes.push(reactionTime);
    this.inputModes.push(mode);
    if (this.currentStimulus) {
      this.currentStimulus.destroy();
      this.currentStimulus = null;
    }
    this.currentStep++;
    this.nextStimulus();
  }

  endExperiment() {
    this.add.text(W * 0.5, H * 0.5, 'Experiment Completed!', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);

    const meanRT = this.reactionTimes.length > 0 ? this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length : 0;
    updateDatabase({
      reactionTimes: this.reactionTimes,
      meanReactionTime: meanRT,
      inputModes: this.inputModes
    }, "srtt");

    this.highscores();
  }

  highscores() {
    setTimeout(() => {
      getHighscores("srtt", "experiment_payload -> meanReactionTime").then((scores) => {
        this.displayHighscores(scores);
      });
    }, 2000);
  }

  displayHighscores(scores) {
    let y = H * 0.23;
    (scores || []).map((score, i) => {
      const v = score.experiment_payload.meanReactionTime;
      if (v === undefined) return;

      this.add.text(W * 0.2, y, `${i + 1}.`, font.larger);
      this.add.text(W * 0.3, y, `${score.nickname || 'Anonymous'}`, font.larger);
      this.add.text(W * 0.7, y, `${v.toFixed(1)}ms`, font.larger);
      y += 50;
    });

    createRebootButton(this, W * 0.5, H * 0.88, () => {
      this.currentStep = 0;
      this.reactionTimes = [];
      this.inputModes = [];
      this.scene.start('BriefingScene');
    });
  }
}

// Countdown scene before SRTT starts
class CountdownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CountdownScene' });
  }
  create() {
    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;
    // Black background
    this.cameras.main.setBackgroundColor('#000000');
    const countdownNumbers = [3, 2, 1];
    let index = 0;
    const text = this.add.text(W * 0.5, H * 0.5, countdownNumbers[index].toString(), {
      fontSize: '80px',
      fill: '#ffffff'
    }).setOrigin(0.5);
    this.time.addEvent({
      delay: 1000,
      repeat: countdownNumbers.length - 1,
      callback: () => {
        index++;
        if (index < countdownNumbers.length) {
          text.setText(countdownNumbers[index].toString());
        } else {
          // Start the experiment
          this.scene.start('SRTTScene');
        }
      }
    });
  }
}

const defaultBriefing = [
  messageMap["BRIEFING_1"] || "Serial Reaction Time Task (SRTT)",
  messageMap["BRIEFING_2"] || "Respond as fast as possible when a square lights up in red.\n\nControls:\n• Click/Tap the red square\n• Keyboard: I (Top-Left), O (Top-Right), K (Bottom-Left), L (Bottom-Right)\n\nClick or press SPACEBAR to start."
];

const briefing = new StandardBriefingScene(
  'Serial Reaction Time Task',
  defaultBriefing,
  'BriefingScene',
  'CountdownScene'
);

const config = PsyExpBaseConfig([briefing, CountdownScene, SRTTScene]);
const game = new Phaser.Game(config);
const W = game.config.width;
const H = game.config.height;
