class SRTTScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SRTTScene' });
        this.sequence = [0, 1, 2, 3]; // Example sequence
        this.currentStep = 0;
        this.stimulusPositions = [
            { x: 200, y: 300 },
            { x: 400, y: 300 },
            { x: 600, y: 300 },
            { x: 800, y: 300 }
        ];
        this.stimulusSize = 50;
        this.reactionTimes = [];
    }

    preload() {
        this.load.image('stimulus', 'https://via.placeholder.com/50'); // Placeholder image for stimulus
    }

    create() {
        this.input.on('pointerdown', this.handleInput, this);
        this.nextStimulus();
    }

    nextStimulus() {
        if (this.currentStep < this.sequence.length) {
            this.currentStimulus = this.add.image(
                this.stimulusPositions[this.sequence[this.currentStep]].x,
                this.stimulusPositions[this.sequence[this.currentStep]].y,
                'stimulus'
            ).setInteractive();
            this.stimulusStartTime = new Date().getTime();
        } else {
            this.endExperiment();
        }
    }

    handleInput(pointer) {
        if (this.currentStimulus) {
            const reactionTime = new Date().getTime() - this.stimulusStartTime;
            this.reactionTimes.push(reactionTime);
            this.currentStimulus.destroy();
            this.currentStimulus = null;
            this.currentStep++;
            this.nextStimulus();
        }
    }

    endExperiment() {
        console.log('Experiment completed. Reaction times:', this.reactionTimes);
        this.add.text(400, 300, 'Experiment Completed!', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    scene: SRTTScene,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
 
