// Expects 'Phaser' to be a global variable;

import {
    font,
    nickname,
    PsyExpBaseConfig,
    fetchMessages,
    updateDatabase,
    getHighscores,
} from '../../psyexp_core.js';

const required = [Phaser];

const messageMap = await fetchMessages("en-us", "bart");

//const root = document.body.getAttribute("data-root") || "";
const root = window.location.href.replace(/\/$/, "");
console.log("root", root);

// Instructions Scene
class InstructionsScene extends Phaser.Scene {
	constructor() {
		super({ key: 'InstructionsScene' });
	}

	preload() {
		this.load.image('background', root + '/assets/fields.jpg');
	}

	create() {
		// Adiciona a imagem de fundo
		this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(2.5);

		// Adiciona um gráfico preto semi-transparente
		const graphics = this.add.graphics();
		graphics.fillStyle(0x000000, 0.7);
		graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

		// Centraliza e adiciona o texto de instruções
		const instructionsText = messageMap["BRIEFING"];
		const instructionsTextStyle = {
			fontSize: '40px',
			fill: '#ffffff',
			wordWrap: { width: this.cameras.main.width - 100 },
		};

		const text = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            instructionsText,
            instructionsTextStyle
        ).setOrigin(0.5);

		// Permite que o jogador avance pressionando ENTER ou clicando na tela
		this.input.keyboard.on('keydown-ENTER', () => {
			this.scene.start('GameScene');
		});
    
		this.input.keyboard.on('keydown-SPACE', () => {
			this.scene.start('GameScene');
		});

		this.input.on('pointerdown', () => {
			this.scene.start('GameScene');
		});
	}
}
// Game Scene
class GameScene extends Phaser.Scene {
	constructor() {
		super({ key: 'GameScene' });
	}

	preload() {
		this.load.audio('balloon-pop', root + '/assets/balloon-pop-93436.mp3');
		this.load.audio('balloon-inflate', root + '/assets/balloon-inflate-1-184052.mp3');
		this.load.audio('cash-reward', root + '/assets/cash-register-kaching-sound-effect-125042.mp3');
		this.load.audio('thump', root + '/assets/thump-2-79980.mp3');

		this.load.image('balloon', root + '/assets/balloon.png');
		this.load.image('button', root + '/assets/button.png');
		this.load.image('piggy', root + '/assets/piggy.png');
		this.load.image('background', root + '/assets/fields.jpg');
	}

	create() {
		scene = this;

		this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(2.5);
		this.add.text(20, 20, messageMap["TITLE"], font.largest);

		balloon = this.add
			.image(W * 0.5, H * 0.9, 'balloon')
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
		currentScoreText = this.add.text(20, 60, '', font.normal);
		setCurrentScore(currentScore);

		const nick = this.add.text(W * 0.7, H * 0.05, `${nickname}`, font.normal);

		lastBalloonScoreText = this.add.text(W * 0.01, H * 0.1, '', font.normal);
		setLastBalloonScore(0);

		helperText = this.add.text(W * 0.01, H * 0.91, messageMap["HELP_POINTER"], font.normal);

		balloonCounterText = this.add.text(20, H * 0.2, '', font.larger);

		this.input.keyboard.on('keydown-SPACE', enablePumping, this);
		this.input.keyboard.on('keyup-SPACE', disablePumping, this);
		this.input.keyboard.on('keydown-ENTER', collectScore, this);

		createCollectButton.bind(this)();

		totalScoreText = this.add.text(W * 0.85, H * 0.77, '', { fontSize: '50px', fill: '#fff' });
		setTotalScore(totalScore);
		initializeBalloonSchedule();
		console.log(balloonSchedule);

		resetBalloon();
	}

	update(time, delta) {
		if (gameOver) {
			return;
		}

		if (time - lastPumpTime > 10) {
			if (pumping) {
				protoPumpBalloon(time - lastPumpTime);
			}
		}

		lastPumpTime = time;
		if (gameOver) {
			return;
		}
	}
}

const config = PsyExpBaseConfig([InstructionsScene, GameScene]);

// Game properties;
const balloonColors = ['0x3366ff', '0xffff00', '0xffa077'];
const balloonDurabilities = [128, 32, 8];

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
let balloonExplosions = [];

const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;


function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

function initializeBalloonSchedule() {
	let schedule = Array(10).fill(0).concat(Array(10).fill(1)).concat(Array(10).fill(2));
	shuffleArray(schedule);
	schedule = schedule.concat(Array(20).fill(0)).concat(Array(20).fill(1)).concat(Array(20).fill(2));
	balloonSchedule = schedule.slice(0, 10);
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
	let collectButton = this.add
		.image(W * 0.9, H * 0.75, 'piggy')
		.setTint('0x000000')
		.setInteractive();

	collectButton.setScale(0.6);

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

function setCurrentScore(score) {
	//currentScoreText.setText(`Current Balloon Score: R$${score.toFixed(2)}`);
}

function setLastBalloonScore(score) {
	lastBalloonScoreText.setText(messageMap['LAST_BALLOON_SCORE'].replace('XXX', score.toFixed(2)));
}

function setTotalScore(score) {
	totalScoreText.setText(messageMap['TOTAL_SCORE'].replace('XXX', score.toFixed(2)));
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

	balloonScores.push(0);
    balloonExplosions.push(currentScore);
	updateSessionRecord();
   
	resetBalloon();
	disablePumping();
	setLastBalloonScore(0);

	currentScore = 0;
}

function updateSessionRecord() {

	updateDatabase({
        totalScore: totalScore,
        balloonScores: balloonScores,
        balloonExplosions: balloonExplosions,
        balloonSchedule: balloonSchedule,
    }, "bart");

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

	balloonScores.push(currentScore);
    balloonExplosions.push(0);
	updateSessionRecord();

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
	balloonCounterText.setText(`${currentBalloonIndex}/${balloonSchedule.length}`);

	if (currentBalloonIndex > balloonSchedule.length) {
		setGameOver();
	}
}

function setGameOver() {
	gameOver = true;

	balloon.destroy();
	balloonCounterText.destroy();
	currentScoreText.destroy();

	helperText.setText(messageMap["GAME_OVER"]);

	setTimeout(getHighscores(
        "bart",
        "experiment_payload -> totalScore",
        false
    ).then((scores) => {
		displayHighscores(scores);
	}), 2000);
}

function displayHighscores(scores) {
	const highscoreText = scene.add.text(W * 0.22, H * 0.23, messageMap["HIGHSCORES_TITLE"], font.normal);
	let y = H * 0.28;
	scores.map((score, i) => {
		scene.add.text(W * 0.28, y + 40 * i, `${i + 1}. ${score.nickname}`, font.normal);
		scene.add.text(W * 0.64, y + 40 * i, messageMap["TOTAL_SCORE"].replace('XXX', score.experiment_payload.totalScore.toFixed(2)), font.normal);
	});
}

function getRandomItem(arr) {
	const randomIndex = Math.floor(Math.random() * arr.length);
	const item = arr[randomIndex];
	arr.splice(randomIndex, 1);
	return item;
}
