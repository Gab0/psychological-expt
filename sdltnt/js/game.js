
import { PsyExpBaseConfig, db, makeid, nickname, fetchMessages, font } from '../../psyexp_core.js';


let digitSequence = [];
let userSequence = [];
let sequenceText;
let inputText;
let feedbackText;
let startButton;
let submitButton;
let currentLevel = 3; // Start with 3 digits


class SDLTNTScene extends Phaser.Scene {

    constructor() {
        super({ key: 'SDLTNTScene' });
    }
   
    create() {

        this.userSuccess = [];
        const buttonSize = 50;
        this.hiddenColor = 0x000000;
        this.visibleColor = 0xffffff;
       
        // Title
        this.add.text(W * 0.5, H * 0.15, 'Serial Digit Learning Test', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        createKeypad(this);
       
        // Sequence display
        sequenceText = this.add.text(M, H * 0.1, '', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);

        // User input
        inputText = this.add.text(M, H * 0.2, '', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        // Feedback
        feedbackText = this.add.text(M, H * 0.3, '', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        // Start button
        this.startButton = this.add.rectangle(M * 1.1, H * 0.5, buttonSize, buttonSize, this.visibleColor).setInteractive().setOrigin(0.5);
        this.add.text(this.startButton.x, this.startButton.y, '👁️', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        this.startButton.on('pointerdown', () => this.startTest(this));

        // Submit button
        submitButton = this.add.rectangle(M * 0.9, H * 0.5, buttonSize, buttonSize, 0xffffff).setInteractive().setOrigin(0.5);
        this.add.text(submitButton.x, submitButton.y, '✔️️', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        submitButton.on('pointerdown', () => this.submitAnswer(this));

        // Keyboard input
        this.input.keyboard.on('keydown', this.handleKeyInput);

        this.createHelpLayer();
        this.selectivelyShowTheHelp(0);
    }

    createHelpLayer() {
        //const helpBg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0);
        this.eyeButtonText = this.add.text(W * 0.73, H * 0.5, '🢀 Click on the eye to reveal the input.', font.help).setOrigin(0.5);
        this.sequenceText = this.add.text(W * 0.25, H * 0.111, 'Memorize this sequence of digits. 🢂', font.help).setOrigin(0.5);
        this.keyboardText = this.add.text(W * 0.24, H * 0.75, 'Use the keypad to enter the digits. 🢂', font.help).setOrigin(0.5);
        this.okButtonText = this.add.text(W * 0.26, H * 0.5, 'Press OK to submit the entered digits. 🢂', font.help).setOrigin(0.5);

        this.helpLayer = [
            this.eyeButtonText,
            this.sequenceText,
            this.keyboardText,
            this.okButtonText
        ];

        this.eyeButtonText.visible = true;
    }

    selectivelyShowTheHelp(showPart) {
        this.helpLayer.forEach((element) => {
            element.visible = false;
        });

        if (showPart === null) {
            return;
        }

        if (currentLevel > 5) {
            return;
        }

        this.helpLayer[showPart].visible = true;

    }

    startTest() {
        digitSequence = generateSequence(currentLevel);
        this.selectivelyShowTheHelp(1);
        displaySequence(this);
    }

    finishExperiment() {
        this.keypadEnabled = false;
        this.updateDatabase();
        this.highscores();
    }

    submitAnswer() {
        if (compareArrays(digitSequence, userSequence)) {
            this.keypadEnabled = false;
            feedbackText.setText('Correct! Moving to next level.');
            this.userSuccess.push(currentLevel);

            this.selectivelyShowTheHelp(0);

            currentLevel++;
            this.startButton.setFillStyle(this.visibleColor);
            if (currentLevel > 9) {
                this.finishExperiment();
            }
        } else {
            feedbackText.setText('Incorrect. Try again.');
            this.userSuccess.push(-currentLevel);
        }
        userSequence = [];

        scene.time.delayedCall(2000, () => {
            feedbackText.setText('');
            inputText.setText('');
        });
    }

    renderSingleScore() {
        let v = score.experiment_payload.winRatio;
        if (v === undefined) return undefined;
        return `${(v * 100).toFixed(2)}%`;
    }

    highscores() {
       setTimeout(
        getHighscores("sdltnt", "experiment_payload -> winRatio DESC")
            .then((scores) => {
                displayHighscores(W, H, scores, this.renderSingleScore);
            }),
        2000
       );
    }

    updateDatabase() {
        updateDatabase({ winRatio: score.experiment_payload.winRatio }, "sdltnt");
    }

    pushInput(value) {
        userSequence.push(value);

        if (userSequence.length == currentLevel) {
            this.selectivelyShowTheHelp(3);
        }

        refreshInput();
    }

    handleKeyInput(event) {
        if (event.keyCode >= 48 && event.keyCode <= 57) {
            this.pushInput(event.key);
        }
    }

}

function createKeypad(scene) {

    scene.keypadEnabled = true;
   
    const keypadConfig = {
        startX: W * 0.425,
        startY: H * 0.6,
        keyWidth: 80,
        keyHeight: 80,
        padding: 20,
        backgroundColor: 0xf0f0f0, // Key color
        pressedColor: 0x555555,    // Color when key is pressed
        textColor: 0xd0d0d0,      // Digit color
        fontSize: 32
    };

    const keys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['C', '0', '⌫']
    ];

    // Loop to create keypad grid
    keys.forEach((row, rowIndex) => {
        row.forEach((key, colIndex) => {
            const x = keypadConfig.startX + (keypadConfig.keyWidth + keypadConfig.padding) * colIndex;
            const y = keypadConfig.startY + (keypadConfig.keyHeight + keypadConfig.padding) * rowIndex;

            const keyButton = scene.add.rectangle(x, y, keypadConfig.keyWidth, keypadConfig.keyHeight, keypadConfig.backgroundColor)
                .setOrigin(0);

            const keyText = scene.add.text(x + keypadConfig.keyWidth / 2, y + keypadConfig.keyHeight / 2, key, {
                fontSize: `${keypadConfig.fontSize}px`,
                color: keypadConfig.textColor,
                align: 'center'
            }).setOrigin(0.5);

            keyButton.setInteractive({ useHandCursor: true });

            keyButton.on('pointerdown', () => {
                if (!scene.keypadEnabled) {
                    return;
                }

                keyButton.setFillStyle(keypadConfig.pressedColor);

                if (key === 'C') {
                    userSequence = [];
                    refreshInput();
                    return;
                }

                if (key === '⌫') {
                    userSequence.pop();
                    refreshInput();
                    return;
                }
               
                scene.pushInput(key);
            });

            keyButton.on('pointerup', () => {
                keyButton.setFillStyle(keypadConfig.backgroundColor);
            });
        });
    });
}


function generateSequence(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

function displaySequence(scene) {
    sequenceText.setText(digitSequence.join(' '));
    scene.keypadEnabled = false;
    scene.time.delayedCall(3000, () => {
        sequenceText.setText('');
        inputText.setText('Your input: ');
        scene.startButton.setFillStyle(scene.hiddenColor);
        scene.keypadEnabled = true;
        scene.selectivelyShowTheHelp(2);
    });
}


function refreshInput() {
    inputText.setText('Your input: ' + userSequence.join(' '));
}


function compareArrays(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((value, index) => value === parseInt(arr2[index]));
} 


const config = PsyExpBaseConfig([SDLTNTScene]);

const game = new Phaser.Game(config);
const W = game.config.width;
const H = game.config.height;
const M = W * 0.5;
