const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let symbols = ['@', '#', '$', '%', '&', '*', '(', ')'];
let digits = ['1', '2', '3', '4', '5', '6', '7', '8'];
let symbolDigitPairs = [];
let currentProblem = [];
let userInput = '';
let score = 0;
let timeLeft = 90; // 90 seconds for the test

let keyText;
let problemText;
let inputText;
let scoreText;
let timerText;
let startButton;

function preload() {
    this.load.image('button', 'assets/button.png');
}

function create() {
    // Title
    this.add.text(400, 30, 'Symbol Digit Substitution Test', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

    // Create symbol-digit pairs
    symbolDigitPairs = createSymbolDigitPairs();

    // Display the key
    keyText = this.add.text(400, 80, '', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
    updateKeyDisplay();

    // Problem display
    problemText = this.add.text(400, 200, '', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // User input
    inputText = this.add.text(400, 300, '', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

    // Score
    scoreText = this.add.text(50, 550, 'Score: 0', { fontSize: '24px', fill: '#fff' });

    // Timer
    timerText = this.add.text(650, 550, 'Time: 90', { fontSize: '24px', fill: '#fff' });

    // Start button
    startButton = this.add.image(400, 500, 'button').setInteractive();
    this.add.text(400, 500, 'Start', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
    startButton.on('pointerdown', startTest);

    // Keyboard input
    this.input.keyboard.on('keydown', handleKeyInput);
}

function update() {
    if (timeLeft > 0 && !startButton.visible) {
        timeLeft -= 1/60; // Assuming 60 FPS
        timerText.setText('Time: ' + Math.ceil(timeLeft));
        
        if (timeLeft <= 0) {
            endTest();
        }
    }
}

function createSymbolDigitPairs() {
    let shuffledDigits = Phaser.Utils.Array.Shuffle(digits.slice());
    return symbols.map((symbol, index) => ({ symbol: symbol, digit: shuffledDigits[index] }));
}

function updateKeyDisplay() {
    let keyString = symbolDigitPairs.map(pair => `${pair.symbol}=${pair.digit}`).join('  ');
    keyText.setText(keyString);
}

function startTest() {
    startButton.visible = false;
    generateProblem();
    timeLeft = 90;
}

function generateProblem() {
    currentProblem = Phaser.Utils.Array.Shuffle(symbolDigitPairs.slice()).slice(0, 3);
    let problemString = currentProblem.map(pair => pair.symbol).join(' ');
    problemText.setText(problemString);
    inputText.setText('Your input: ');
    userInput = '';
}

function handleKeyInput(event) {
    if (timeLeft > 0 && !startButton.visible) {
        if (event.keyCode >= 48 && event.keyCode <= 57) {
            userInput += event.key;
            inputText.setText('Your input: ' + userInput);
            
            if (userInput.length === 3) {
                checkAnswer();
            }
        }
    }
}

function checkAnswer() {
    let correct = currentProblem.every((pair, index) => pair.digit === userInput[index]);
    if (correct) {
        score++;
        scoreText.setText('Score: ' + score);
    }
    generateProblem();
}

function endTest() {
    problemText.setText('Test Complete!');
    inputText.setText('Final Score: ' + score);
    startButton.visible = true;
    this.add.text(400, 500, 'Restart', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
} 
