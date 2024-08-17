
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
   
    preload() {}

    create() {
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
        this.startButton.on('pointerdown', () => startTest(this));

        // Submit button
        submitButton = this.add.rectangle(M * 0.9, H * 0.5, buttonSize, buttonSize, 0xffffff).setInteractive().setOrigin(0.5);
        this.add.text(submitButton.x, submitButton.y, '✔️️', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        submitButton.on('pointerdown', () => submitAnswer(this));

        // Keyboard input
        this.input.keyboard.on('keydown', handleKeyInput);
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
               
                userSequence.push(key);
                refreshInput();
            });

            keyButton.on('pointerup', () => {
                keyButton.setFillStyle(keypadConfig.backgroundColor);
            });
        });
    });
}

function startTest(scene) {
    digitSequence = generateSequence(currentLevel);
    displaySequence(scene);
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
    });
}

function handleKeyInput(event) {
    if (event.keyCode >= 48 && event.keyCode <= 57) {
        userSequence.push(event.key);
        refreshInput();
    }
}

function refreshInput() {
    inputText.setText('Your input: ' + userSequence.join(' '));
}

function submitAnswer(scene) {
    if (compareArrays(digitSequence, userSequence)) {
        scene.keypadEnabled = false;
        feedbackText.setText('Correct! Moving to next level.');
        currentLevel++;
        scene.startButton.setFillStyle(scene.visibleColor);
    } else {
        feedbackText.setText('Incorrect. Try again.');
    }
    userSequence = [];

    scene.time.delayedCall(2000, () => {
        feedbackText.setText('');
        inputText.setText('');
    });
}

function compareArrays(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((value, index) => value === parseInt(arr2[index]));
} 


const config = PsyExpBaseConfig([SDLTNTScene]);

const game = new Phaser.Game(config);
const W = game.config.width;
const H = game.config.height;
const M = W * 0.5;
