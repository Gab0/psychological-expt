class SRTTScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SRTTScene' });
        this.sequence = [0, 1, 2, 3]; // Example sequence
        this.currentStep = 0;
        this.stimulusPositions = [
            { x: 100, y: 100 }, // Top-left
            { x: 700, y: 100 }, // Top-right
            { x: 100, y: 500 }, // Bottom-left
            { x: 700, y: 500 }  // Bottom-right
        ];
        this.stimulusSize = 50;
        this.reactionTimes = [];
    }

    preload() {
        this.load.image('marker', 'https://via.placeholder.com/50'); // Placeholder image for marker
    }

    create() {
        this.createMarkers();
        this.input.keyboard.on('keydown', this.handleInput, this);
        this.nextStimulus();
    }

    createMarkers() {
        for (let pos of this.stimulusPositions) {
            this.add.image(pos.x, pos.y, 'marker');
        }
    }

    nextStimulus() {
        if (this.currentStep < this.sequence.length) {
            this.currentStimulusIndex = this.sequence[this.currentStep];
            this.currentStimulus = this.add.image(
                this.stimulusPositions[this.currentStimulusIndex].x,
                this.stimulusPositions[this.currentStimulusIndex].y,
                'marker'
            ).setTint(0xff0000); // Highlight the current stimulus
            this.stimulusStartTime = new Date().getTime();
        } else {
            this.endExperiment();
        }
    }

    handleInput(event) {
        if (!this.currentStimulus) return;

        let keyMap = {
            'ArrowLeft': 0,
            'ArrowRight': 1,
            'ArrowDown': 2,
            'ArrowUp': 3
        };

        if (event.key in keyMap && keyMap[event.key] === this.currentStimulusIndex) {
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
    width: 800,
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

