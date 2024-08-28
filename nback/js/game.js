
import { PsyExpBaseConfig,
         font,
         updateDatabase,
         getHighscores,
         displayHighscores
       } from '../../psyexp_core.js';

class NBackTaskScene extends Phaser.Scene {
    constructor() {
        super({ key: 'NBackTaskScene' });
        this.stimuli = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

        this.nBackValue = 2; // N-Back level
        this.sequence = [];
        this.currentStimulusIndex = 0;
        this.inputEnabled = false;
        this.responseKeys = ['Y', 'N']; // Y for match, N for no match
        this.nStimulus = 25;

        this.userResponses = [];
        this.userResults = [];
    }

    drawButton(color, text, x, y, size, onClick = () => {}) {
        const button = this.add.rectangle(x, y, size, size, color).setOrigin(0.5);
        this.add.text(x, y, text, { fontSize: size * 0.7, fill: '#fff' }).setOrigin(0.5);

        button.setInteractive();
        button.on('pointerdown', onClick);
        return button;
    }

    create() {
        this.feedbackMessage = this.add.text(W * 0.5, H * 0.2, '', { fontSize: 72, fill: '#fff' }).setOrigin(0.5);
        const size = 150;

        this.stimulusBacklight = this.add.rectangle(W * 0.5, H * 0.5, size * 1.2, size * 1.2, 0xffffff).setOrigin(0.5);
        this.stimulusBackground = this.add.rectangle(W * 0.5, H * 0.5, size, size, 0xfff).setOrigin(0.5);
        this.stimulusDisplay = this.add.text(W * 0.5, H * 0.5, '', { fontSize: size * 0.9, fill: 0xfff }).setOrigin(0.5);

        this.helpMessage = this.add.text(W * 0.5, H * 0.9, 'Press Y for match, N for no match', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        
        this.input.keyboard.on('keydown', this.handleInput, this);

        const buttonYes = this.drawButton(0x00d000, "Y", W * 0.7, H * 0.7, 150, () => this.checkAnswer(true));
        const buttonNo = this.drawButton(0xd00000, "N", W * 0.3, H * 0.7, 150, () => this.checkAnswer(false));

        this.startTask();
    }

    startTask() {
        this.sequence = this.generateSequence();
        this.displayStimulus();
    }

    generateSequence() {
        let seq = [];
        for (let i = 0; i < this.nStimulus; i++) {
            let stimulus = this.stimuli[Phaser.Math.Between(0, this.stimuli.length - 1)];
            seq.push(stimulus);
        }
        return seq;
    }

    displayStimulus() {
        if (this.currentStimulusIndex < this.sequence.length) {
            this.stimulusDisplay.setText(this.sequence[this.currentStimulusIndex]);
            this.stimulusBacklight.setAlpha(1.0);
            this.time.delayedCall(100, () => this.stimulusBacklight.setAlpha(0.0), [], this);
            this.inputEnabled = true;
            this.userResponses.push(null);
            this.time.delayedCall(2000, this.nextStimulus, [], this);
        } else {
            this.endTask();
        }
    }

    nextStimulus() {
        this.inputEnabled = false;
        this.currentStimulusIndex++;
        this.displayStimulus();
    }

    handleInput(event) {
        if (!this.inputEnabled) return;

        const key = event.key.toUpperCase();
        if (!this.responseKeys.includes(key)) return;

        if (key === 'Y') this.checkAnswer(true);

        if (key === 'N') this.checkAnswer(false);
    }

    checkAnswer(userAnswer) {
        console.log(userAnswer);
        // Check if the response is correct
        const result = this.checkMatch() === userAnswer;
        if (this.userResponses[this.currentStimulusIndex] === null) {
            this.userResponses[this.currentStimulusIndex] = userAnswer;
            this.displayResult(result);
            this.userResults.push(result);
        }
    }
   
    checkMatch() {
        if (this.currentStimulusIndex >= this.nBackValue) {
            return this.sequence[this.currentStimulusIndex] === this.sequence[this.currentStimulusIndex - this.nBackValue];
        }
        return false;
    }

    endTask() {
        this.helpMessage.setText('Task Completed');
        this.updateDatabase();
        this.highscores();
    }

    displayResult(result) {
        const color = result ? 0x00d000 : 0xd00000;
        const message = result ? 'Correct' : 'Incorrect';

        this.feedbackMessage.setTint(color);
        this.feedbackMessage.setText(message);
       
        this.time.delayedCall(1000, () => {
            this.feedbackMessage.setTint(0xffffff);
            this.feedbackMessage.setText('');
        });
    }

    updateDatabase() {
        updateDatabase({
            userResponses: this.userResponses,
            userResults: this.userResults,
            winRatio: this.userResults.filter((r) => r).length / this.userResults.length,
            nBackValue: this.nBackValue
        }, "nback");
    }

    highscores() {
          setTimeout(
            getHighscores("nback", "experiment_payload -> winRatio DESC")
                .then((scores) => {
                    displayHighscores(W, H, scores, this.renderSingleScore);
                }),
            2000
        );
    }

    renderSingleScore(score) {
        let v = score.experiment_payload.winRatio;
        if (v === undefined) return undefined;
        return `${(v * 100).toFixed(2)}%`;
    }
}


const config = PsyExpBaseConfig([NBackTaskScene])
const game = new Phaser.Game(config);
 
const W = game.config.width;
const H = game.config.height;
