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
  displayHighscores,
  getCookie,
  createRebootButton
} from '../../psyexp_core.js';

let digitSequence = [];
let userSequence = [];
let sequenceText;
let inputText;
let feedbackText;
let startButton;
let submitButton;
let currentLevel = 3; // Start with 3 digits

const activeLang = getCookie('language') || 'en-us';
let messageMap = {};
try {
  messageMap = await fetchMessages(activeLang, "sdltnt") || {};
} catch (e) {
  console.log("SDLTNT: message fetch failed");
}

class SDLTNTScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SDLTNTScene' });
        this.totalAttempts = 0;
        this.correctAttempts = 0;
    }
   
    create() {
        scene = this;
        this.userSuccess = [];
        const buttonSize = 50;
        this.hiddenColor = 0x000000;
        this.visibleColor = 0xffffff;
       
        // Title
        this.add.text(W * 0.5, H * 0.08, 'Serial Digit Learning Test', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        createKeypad(this);
       
        // Sequence display
        sequenceText = this.add.text(M, H * 0.15, '', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);

        // User input
        inputText = this.add.text(M, H * 0.23, '', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        // Feedback
        feedbackText = this.add.text(M, H * 0.32, '', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        // Start button
        this.startButton = this.add.rectangle(M * 1.1, H * 0.45, buttonSize, buttonSize, this.visibleColor).setInteractive().setOrigin(0.5);
        this.add.text(this.startButton.x, this.startButton.y, '👁️', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        this.startButton.on('pointerdown', () => this.startTest());

        // Submit button
        submitButton = this.add.rectangle(M * 0.9, H * 0.45, buttonSize, buttonSize, 0xffffff).setInteractive().setOrigin(0.5);
        this.add.text(submitButton.x, submitButton.y, '✔️️', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        submitButton.on('pointerdown', () => this.submitAnswer());

        // Keyboard input
        this.input.keyboard.on('keydown', (e) => this.handleKeyInput(e));

        this.createHelpLayer();
        this.selectivelyShowTheHelp(0);
    }

    createHelpLayer() {
        this.eyeButtonText = this.add.text(W * 0.73, H * 0.45, '🢀 Click on the eye to reveal the input.', font.help).setOrigin(0.5);
        this.sequenceText = this.add.text(W * 0.25, H * 0.15, 'Memorize this sequence of digits. 🢂', font.help).setOrigin(0.5);
        this.keyboardText = this.add.text(W * 0.24, H * 0.75, 'Use the keypad to enter the digits. 🢂', font.help).setOrigin(0.5);
        this.okButtonText = this.add.text(W * 0.26, H * 0.45, 'Press OK to submit the entered digits. 🢂', font.help).setOrigin(0.5);

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

        if (showPart === null || currentLevel > 5) {
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
        const winRatio = this.totalAttempts > 0 ? this.correctAttempts / this.totalAttempts : 0;
        updateDatabase({ winRatio: winRatio, totalAttempts: this.totalAttempts, correctAttempts: this.correctAttempts }, "sdltnt");
        this.highscores();
    }

    submitAnswer() {
        this.totalAttempts++;
        if (compareArrays(digitSequence, userSequence)) {
            this.correctAttempts++;
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

        this.time.delayedCall(2000, () => {
            feedbackText.setText('');
            inputText.setText('');
        });
    }

    renderSingleScore(score) {
        let v = score?.experiment_payload?.winRatio;
        if (v === undefined) return undefined;
        return `${(v * 100).toFixed(2)}%`;
    }

    highscores() {
       setTimeout(() => {
        getHighscores("sdltnt", "experiment_payload -> winRatio DESC")
            .then((scores) => {
                displayHighscores(this, W, H, scores, this.renderSingleScore);
                createRebootButton(this, W * 0.5, H * 0.88, () => {
                    currentLevel = 3;
                    userSequence = [];
                    digitSequence = [];
                    this.totalAttempts = 0;
                    this.correctAttempts = 0;
                    this.scene.start('BriefingScene');
                });
            });
       }, 2000);
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
        } else if (event.key === 'Enter') {
            this.submitAnswer();
        } else if (event.key === 'Backspace') {
            userSequence.pop();
            refreshInput();
        }
    }
}

function createKeypad(scene) {
    scene.keypadEnabled = true;
   
    const keypadConfig = {
        startX: W * 0.425,
        startY: H * 0.55,
        keyWidth: 80,
        keyHeight: 80,
        padding: 20,
        backgroundColor: 0xf0f0f0,
        pressedColor: 0x555555,
        textColor: 0x101010,
        fontSize: 32
    };

    const keys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['C', '0', '⌫']
    ];

    keys.forEach((row, rowIndex) => {
        row.forEach((key, colIndex) => {
            const x = keypadConfig.startX + (keypadConfig.keyWidth + keypadConfig.padding) * colIndex;
            const y = keypadConfig.startY + (keypadConfig.keyHeight + keypadConfig.padding) * rowIndex;

            const keyButton = scene.add.rectangle(x, y, keypadConfig.keyWidth, keypadConfig.keyHeight, keypadConfig.backgroundColor)
                .setOrigin(0);

            scene.add.text(x + keypadConfig.keyWidth / 2, y + keypadConfig.keyHeight / 2, key, {
                fontSize: `${keypadConfig.fontSize}px`,
                color: keypadConfig.textColor,
                align: 'center'
            }).setOrigin(0.5);

            keyButton.setInteractive({ useHandCursor: true });

            keyButton.on('pointerdown', () => {
                if (!scene.keypadEnabled) return;

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

let scene = null;

const defaultBriefing = [
  messageMap["BRIEFING_1"] || "Serial-Digit Learning Test (SDLT)",
  messageMap["BRIEFING_2"] || "In this test, a sequence of digits will be displayed briefly.\nMemorize the numbers and enter them using the keypad or keyboard.\n\nClick or press SPACEBAR to begin."
];

const briefing = new StandardBriefingScene(
    "Serial Digit Learning Test",
    defaultBriefing,
    "BriefingScene",
    "SDLTNTScene"
);

const config = PsyExpBaseConfig([briefing, SDLTNTScene]);

const game = new Phaser.Game(config);
const W = game.config.width;
const H = game.config.height;
const M = W * 0.5;
