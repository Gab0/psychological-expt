const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create
    }
};

const game = new Phaser.Game(config);

let digitSequence = [];
let userSequence = [];
let sequenceText;
let inputText;
let feedbackText;
let startButton;
let submitButton;
let currentLevel = 3; // Start with 3 digits

function preload() {
    this.load.image('button', 'assets/button.png');
}

function create() {
    // Title
    this.add.text(400, 50, 'Serial Digit Learning Test', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // Sequence display
    sequenceText = this.add.text(400, 200, '', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);

    // User input
    inputText = this.add.text(400, 300, '', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // Feedback
    feedbackText = this.add.text(400, 400, '', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

    // Start button
    startButton = this.add.image(300, 500, 'button').setInteractive();
    this.add.text(300, 500, 'Start', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
    startButton.on('pointerdown', startTest);

    // Submit button
    submitButton = this.add.image(500, 500, 'button').setInteractive();
    this.add.text(500, 500, 'Submit', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
    submitButton.on('pointerdown', submitAnswer);

    // Keyboard input
    this.input.keyboard.on('keydown', handleKeyInput);
}

function startTest() {
    digitSequence = generateSequence(currentLevel);
    displaySequence();
}

function generateSequence(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

function displaySequence() {
    sequenceText.setText(digitSequence.join(' '));
    this.time.delayedCall(3000, () => {
        sequenceText.setText('');
        inputText.setText('Your input: ');
    });
}

function handleKeyInput(event) {
    if (event.keyCode >= 48 && event.keyCode <= 57) {
        userSequence.push(event.key);
        inputText.setText('Your input: ' + userSequence.join(' '));
    }
}

function submitAnswer() {
    if (compareArrays(digitSequence, userSequence)) {
        feedbackText.setText('Correct! Moving to next level.');
        currentLevel++;
    } else {
        feedbackText.setText('Incorrect. Try again.');
    }
    userSequence = [];
    this.time.delayedCall(2000, () => {
        feedbackText.setText('');
        inputText.setText('');
    });
}

function compareArrays(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((value, index) => value === parseInt(arr2[index]));
} 
