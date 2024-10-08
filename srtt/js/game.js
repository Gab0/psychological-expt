
import { PsyExpBaseConfig,
         db,
         makeid,
         nickname,
         fetchMessages,
         font,
         updateDatabase,
         getHighscores
       } from '../../psyexp_core.js';

class SRTTScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SRTTScene' });
        const stimulus = [0, 1, 2, 3]; // Example sequence

        this.sequence = Array.from(Array(20)).map(() => stimulus[Math.floor(Math.random() * stimulus.length)]);
        console.log(this.sequence);
        this.currentStep = 0;

        const sX = [W * 0.25, W * 0.75];
        const sY = [H * 0.25, H * 0.75];

        this.stimulusPositions = [
            { x: sX[0], y: sY[0] }, // Top-left
            { x: sX[1], y: sY[0] }, // Top-right
            { x: sX[0], y: sY[1] }, // Bottom-left
            { x: sX[1], y: sY[1] }  // Bottom-right
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
            )

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
            'i': 0,
            'o': 1,
            'k': 2,
            'l': 3
        };

        console.log(event.key);

        if (event.key in keyMap && keyMap[event.key] === this.currentStimulusIndex) {
            this.computeStimulus("keyboard");
        }
    }

    computeStimulus(mode) {
        const reactionTime = new Date().getTime() - this.stimulusStartTime;
        this.reactionTimes.push(reactionTime);
        this.inputModes.push(mode);
        this.currentStimulus.destroy();
        this.currentStimulus = null;
        this.currentStep++;
        this.nextStimulus();
    }

    endExperiment() {
        console.log('Experiment completed. Reaction times:', this.reactionTimes);
        this.add.text(W * 0.5, H * 0.5, 'Experiment Completed!', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);

        updateDatabase({
            reactionTimes: this.reactionTimes,
            meanReactionTime: this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length,
            inputModes: this.inputModes
        }, "srtt");

        this.highscores();
    }

    highscores() {

        setTimeout(getHighscores("srtt", "experiment_payload -> meanReactionTime").then((scores) => {
            this.displayHighscores(scores);
        }), 2000);

    }

    displayHighscores(scores) {
        let y = H * 0.23;
        scores.map((score, i) => {
            const v = score.experiment_payload.meanReactionTime;
            if (v === undefined) return;

            this.add.text(W * 0.2, y, `${i + 1}.`, font.larger);
            this.add.text(W * 0.3, y, `${score.nickname}`, font.larger);
            this.add.text(W * 0.7, y, `${v}`, font.larger);
            y += 50;
        });
    }
}

const config = PsyExpBaseConfig(SRTTScene);

const game = new Phaser.Game(config);
const W = game.config.width;
const H = game.config.height;
