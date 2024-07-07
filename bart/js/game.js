// Expects 'Phaser' to be a global variable;

import { update_database, nickname, getHighscores } from './database.js';


function resize() {
      var canvas = document.querySelector("canvas");
      var windowWidth = window.innerWidth;
      var windowHeight = window.innerHeight;
      var windowRatio = windowWidth / windowHeight;
      var gameRatio = game.config.width / game.config.height;
      if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
      } else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
      }
}

const config = {
    type: Phaser.WEBGL,
    antialias: true,
    //width: window.innerWidth,
    //height: window.innerHeight,
    width: 1920,
    height: 1000,
    backgroundColor: '#f0f0f0',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    fps: {
        min: 60,
        target: 60,
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER,
orientation: 'landscape',
    }
};

// Game properties;
const balloonColors = ['0x3366ff', '0xffff00', '0xffa077'];
const balloonDurabilities = [128, 32, 8];


const normalFont = { fontSize: '40px', fill: '#000', backgroundColor: '#f0f0f0' };
const largerFont = { fontSize: '44px', fill: '#101010', backgroundColor: '#f0f0f0' };
const largestFont = { fontSize: '52px', fill: '#000', fontWeight: 'bold' };

const gameConstants = {
    balloonInitialSize: 1.0,
    balloonSizeIncreaseRate: 0.00005,
    balloonPumpMultiplier: 50,
};

let scene;

// Buffers;
let currentScore = 0;
let totalScore = 0;
let balloonSize = 1;
let maxPumps = 0;
let currentColorIndex = 0;
let currentBalloonIndex = 0;
let balloon;
let pumping = false;

let currentScoreText;
let helperText;
let totalScoreText;
let balloonCounterText;
let lastBalloonScoreText;

let lastPumpTime = 0;
let balloonSchedule = [];
let balloonDurabilityState = [];
let popSound;
let thumpSound;
let cashRewardSound;
let inflateSound;
let gameOver = false;
let pumpCount = 0;

let balloonScores = [];

const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;

//resize();
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function initializeSchedule() {
    let schedule = Array(10).fill(0).concat(Array(10).fill(1)).concat(Array(10).fill(2));
    shuffleArray(schedule);
    schedule = schedule.concat(Array(20).fill(0)).concat(Array(20).fill(1)).concat(Array(20).fill(2));
    balloonSchedule = schedule.slice(0, 10);
}

function preload() {
    this.load.audio('balloon-pop', '/assets/balloon-pop-93436.mp3');
    this.load.audio('balloon-inflate', '/assets/balloon-inflate-1-184052.mp3');
    this.load.audio('cash-reward', '/assets/cash-register-kaching-sound-effect-125042.mp3');
    this.load.audio('thump', '/assets/thump-2-79980.mp3');

    this.load.image('balloon', '/assets/balloon.png');
    this.load.image('button', '/assets/button.png');
    this.load.image('piggy', '/assets/piggy.png');
    this.load.image('background', '/assets/fields.jpg');
}

function createPumpButton() {
    // Create buttons using Phaser
    let pumpButton = this.add.image(800, 600, 'button').setInteractive();

    pumpButton.setScale(0.2);

    this.add.text(780, 610, 'Pump', { fontSize: '18px', fill: '#c5c5c5' });

    pumpButton.on('pointerdown', enablePumping, this);
    pumpButton.on('pointerup', disablePumping, this);

}

function createCollectButton() {
    let collectButton = this.add.image(W * 0.9, H * 0.8, 'piggy')
                            .setTint("0x000000")
                            .setInteractive();

    collectButton.setScale(0.5);

    //this.add.text(890, 610, 'Collect', { fontSize: '18px', fill: '#c5c5c5' });

    collectButton.on('pointerdown', collectScore, this);
}

function enablePumping() {

    if (gameOver) {
        return;
    }

    if (!pumping) {
        inflateSound.play();
    }
    pumping = true;
}

function disablePumping() {
    pumping = false;
}

function create() {
    scene = this;
   
    this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(0.5);
    this.add.text(20, 20, 'BART - Balloon Analogue Risk Task', largestFont);

    balloon = this.add.image(W * 0.5, H * 0.90, 'balloon')
                  .setScale(balloonSize)
                  .setTint(balloonColors[currentColorIndex])
                  .setInteractive();

    // Make the balloon interactive and pump on click
    balloon.on('pointerdown', enablePumping, this);
    balloon.on('pointerup', disablePumping, this);

    popSound = this.sound.add('balloon-pop');
    inflateSound = this.sound.add('balloon-inflate');

    thumpSound = this.sound.add('thump');
    cashRewardSound = this.sound.add('cash-reward');
    currentScoreText = this.add.text(20, 60, '', normalFont);
    setCurrentScore(currentScore);

    const m = this.add.text(
        W * 0.75,
        H * 0.05,
        `${nickname}`,
        normalFont
    );

    lastBalloonScoreText = this.add.text(20, 120, '', normalFont);
    setLastBalloonScore(0);

    const message_keyboard = 'Press SPACE to pump the balloon, and ENTER to collect its current value';
    const message_touch = 'Tap the balloon to pump it, and tap the piggy bank to collect its current value';
    helperText = this.add.text(W * 0.01, H * 0.93, message_touch, normalFont);

    balloonCounterText = this.add.text(20, 150, '', largerFont);

    this.input.keyboard.on('keydown-SPACE', enablePumping, this);
    this.input.keyboard.on('keyup-SPACE', disablePumping, this);
    this.input.keyboard.on('keydown-ENTER', collectScore, this);

    createCollectButton.bind(this)();

    totalScoreText = this.add.text(W * 0.85, H * 0.82, '', {fontSize: "50px", fill: '#fff'});
    setTotalScore(totalScore);
    initializeSchedule();
    console.log(balloonSchedule);

    resetBalloon();
}

function update(time, delta) {
    if (gameOver) {
        return;
    }

    if (time - lastPumpTime > 10) {
    if (pumping) {
        protoPumpBalloon(time - lastPumpTime);
    }}

    lastPumpTime = time;
    if (gameOver) {
        this.add.text(20, 120, 'You have completed the task. Press F5 to restart.', normalFont);
        return;
    }
}

function setCurrentScore(score) {
    //currentScoreText.setText(`Current Balloon Score: R$${score.toFixed(2)}`);
}

function setLastBalloonScore(score) {
    lastBalloonScoreText.setText(`Last Balloon Score: R$${score.toFixed(2)}`);
}

function setTotalScore(score) {
    totalScoreText.setText(`R$${totalScore.toFixed(2)}`);
}

function protoPumpBalloon(msElapsed) {
    balloonSize += gameConstants.balloonSizeIncreaseRate * msElapsed;
    balloon.setScale(balloonSize);
    const k = Math.round((balloonSize - gameConstants.balloonInitialSize) * gameConstants.balloonPumpMultiplier);
    if (k > pumpCount) {
        pumpCount = k;
        pumpBalloon();
    }
}

function pumpBalloon() {

    currentScore += 0.05;
    setCurrentScore(currentScore);
    const m = getRandomItem(balloonDurabilityState);
    if (m === 0) {
        popBalloon();
    }
}

function popBalloon() {
    popSound.play();
    resetBalloon();
    disablePumping();
    setLastBalloonScore(0);

    currentScore = 0;
    updateDatabase();

}

function updateDatabase() {
    balloonScores.push(currentScore);
    update_database(totalScore, balloonScores, balloonSchedule);
}


function collectScore() {
    if (gameOver) {
        return;
    }

    if (currentScore === 0) {
        thumpSound.play();
        return;
    }

    totalScore += currentScore;
    setLastBalloonScore(currentScore);
    cashRewardSound.play();

    setTotalScore(totalScore);
    updateDatabase();
  
    resetBalloon();
}

function resetBalloon() {
    if (gameOver) {
        return;
    }
    disablePumping();

    balloonSize = gameConstants.balloonInitialSize;
    pumpCount = 0;

    currentScore = 0;
    setCurrentScore(currentScore);
    currentColorIndex = balloonSchedule[currentBalloonIndex];
    balloonDurabilityState = Array.from(Array(balloonDurabilities[currentColorIndex]).keys());
    balloon.setOrigin(0.5, 1.0);
    balloon.setScale(balloonSize);
    balloon.setTint(balloonColors[currentColorIndex]);
    currentBalloonIndex++;
    balloonCounterText.setText(`Balloon ${currentBalloonIndex}/${balloonSchedule.length}`);

    if (currentBalloonIndex > balloonSchedule.length) {
        setGameOver();
    }
}

function setGameOver() {
    gameOver = true;

    balloon.destroy();
    balloonCounterText.destroy();
    currentScoreText.destroy();

    helperText.setText(`You have completed the task. You have won R$${totalScore.toFixed(2)}!Press F5 to try again.`);

    const scores = getHighscores().then((scores) => {
        displayHighscores(scores);
    })

}

function displayHighscores(scores) {

    const highscoreText = scene.add.text(W * 0.30, H * 0.3, 'Highscores:', normalFont);
    let y = H * 0.35;
    scores.map((score, i) => {
        scene.add.text(W * 0.36, y + 40 * i, `${i + 1}. ${score.nickname}: R$${score.score.toFixed(2)}`, normalFont);
    });
}

function getRandomItem(arr) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const item = arr[randomIndex];
    arr.splice(randomIndex, 1);
    return item;
}
