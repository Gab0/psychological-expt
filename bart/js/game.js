import {
	font,
	nickname,
	PsyExpBaseConfig,
	fetchMessages,
	updateDatabase,
	getHighscores,
	getCookie,
	createRebootButton,
} from '../../psyexp_core.js';

const required = [Phaser];

const activeLang = getCookie('language') || 'en-us';
const currencySymbol = activeLang === 'pt-br' ? 'R$' : '$';
const messageMap = await fetchMessages(activeLang, 'bart');

const root = window.location.href.replace(/\/$/, "");
console.log("root", root);

class InstructionsScene extends Phaser.Scene {
	constructor() {
		super({ key: 'InstructionsScene' });
	}

	preload() {
		this.load.image('background', root + '/assets/fields.jpg');

		this.load.image('explosion-yelloww', root + '/assets/explosion-yelloww.png');
	}

	create() {
		this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(2.5);

		const graphics = this.add.graphics();
		graphics.fillStyle(0x000000, 0.7);
		graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

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
		// Removed test title from the main game view

		balloon = this.add
			.image(W * 0.5, H * 0.9, 'balloon')
			.setScale(balloonSize)
			.setTint(balloonColors[currentColorIndex])
			.setInteractive();

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


		// Slider vertical para velocidade (parte medial esquerda)
		const sY = SLIDER_START_Y;
		const sH = SLIDER_HEIGHT;

		// Label above slider
		this.add.text(SLIDER_X, sY - 45, messageMap['SPEED_LABEL'] || 'Speed', {
			fontSize: '22px', fill: '#ffffff', fontStyle: 'bold'
		}).setOrigin(0.5, 0.5);

		// Slider track background
		const sliderBg = this.add.graphics();
		sliderBg.fillStyle(0x444444, 0.9);
		sliderBg.fillRoundedRect(SLIDER_X - SLIDER_TRACK_W / 2, sY, SLIDER_TRACK_W, sH, 8);
		sliderBg.lineStyle(2, 0xaaaaaa, 1);
		sliderBg.strokeRoundedRect(SLIDER_X - SLIDER_TRACK_W / 2, sY, SLIDER_TRACK_W, sH, 8);

		// Handle (enlarged for mobile touch)
		const initialT = Phaser.Math.Clamp(
			(balloonPumpRate - 0.0001) / (0.0003 - 0.0001), 0, 1
		);
		rateSlider = this.add.rectangle(
			SLIDER_X,
			sY + sH * (1 - initialT),
			SLIDER_HANDLE_W,
			SLIDER_HANDLE_H,
			0x44aaff
		).setOrigin(0.5).setInteractive({ draggable: true, useHandCursor: true });
		rateSlider.setStrokeStyle(2, 0xffffff);

		// Rate text below slider
		rateSliderText = this.add.text(SLIDER_X, sY + sH + 25, `${balloonPumpRate.toFixed(5)}`, {
			fontSize: '18px', fill: '#ffffff'
		}).setOrigin(0.5, 0);

		// Enable drag
		this.input.setDraggable(rateSlider);

		this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
			if (gameObject === rateSlider) {
				const minY = sY;
				const maxY = sY + sH;
				const clampedY = Phaser.Math.Clamp(dragY, minY, maxY);
				gameObject.y = clampedY;

				const t = 1 - ((clampedY - minY) / sH);
				balloonPumpRate = Phaser.Math.Linear(0.0001, 0.0003, t);

				rateSliderText.setText(`${balloonPumpRate.toFixed(5)}`);
			}
		});

		// Keyboard controls
		this.input.keyboard.on('keydown-SPACE', enablePumping, this);
		this.input.keyboard.on('keyup-SPACE', disablePumping, this);
		this.input.keyboard.on('keydown-ENTER', collectScore, this);
		this.input.keyboard.on('keydown-UP', () => { adjustSlider(0.05); });
		this.input.keyboard.on('keydown-DOWN', () => { adjustSlider(-0.05); });

		createCollectButton.bind(this)();

		totalScoreText = this.add.text(W * 0.85, H * 0.77, '', { fontSize: '50px', fill: '#fff' });
		setTotalScore(totalScore);
		initializeBalloonSchedule();

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

const balloonColors = ['0x3366ff', '0xffff00', '0xffa077'];
const balloonDurabilities = [128, 32, 8];

const gameConstants = {
	balloonInitialSize: 1.0,
	balloonSizeIncreaseRate: 0.00005,
	balloonPumpMultiplier: 50,
};

let scene;
let currentScore = 0;
let totalScore = 0;
let balloonSize = 1;
let maxPumps = 0;
let currentColorIndex = 0;
let currentBalloonIndex = 0;
let balloon;
let pumping = false;

let balloonCount = 10;

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

let balloonPumpRate = 0.00005; // valor inicial da velocidade

let rateSlider;
let rateSliderText;

let balloonScores = [];
let balloonExplosions = [];
let pumpRates = [];
let pumpThrottlePercentages = [];
let currentBalloonPumpRates = [];
let currentBalloonPumpThrottlePercentages = [];
let balloonPumpRates = [];
let balloonPumpThrottlePercentages = [];

const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;

// Slider dimension constants (depend on H)
const SLIDER_X = 60;
const SLIDER_START_Y = H * 0.3;
const SLIDER_HEIGHT = 300;
const SLIDER_TRACK_W = 30;
const SLIDER_HANDLE_W = 50;
const SLIDER_HANDLE_H = 30;

function getThrottlePct(rate) {
	const pct = ((rate - 0.0001) / 0.0002) * 100;
	return parseFloat(Phaser.Math.Clamp(pct, 0, 100).toFixed(2));
}

function adjustSlider(delta) {
	const currentT = 1 - ((rateSlider.y - SLIDER_START_Y) / SLIDER_HEIGHT);
	const newT = Phaser.Math.Clamp(currentT + delta, 0, 1);
	rateSlider.y = SLIDER_START_Y + SLIDER_HEIGHT * (1 - newT);
	balloonPumpRate = Phaser.Math.Linear(0.0001, 0.0003, newT);
	rateSliderText.setText(`${balloonPumpRate.toFixed(5)}`);
}

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

	balloonSchedule = schedule.slice(0, balloonCount);
}

function createPumpButton() {
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

function setCurrentScore(score) { }

function setLastBalloonScore(score) {
	const rawMsg = messageMap['LAST_BALLOON_SCORE'] || 'Last Score: XXX';
	const formattedVal = score.toFixed(2);
	if (rawMsg.includes('XXX')) {
		lastBalloonScoreText.setText(rawMsg.replace('XXX', formattedVal));
	} else {
		lastBalloonScoreText.setText(`${rawMsg}: ${currencySymbol} ${formattedVal}`);
	}
}

function setTotalScore(score) {
	const rawMsg = messageMap['TOTAL_SCORE'] || '$XXX';
	const formattedVal = score.toFixed(2);
	if (rawMsg.includes('XXX')) {
		totalScoreText.setText(rawMsg.replace('XXX', formattedVal));
	} else {
		totalScoreText.setText(`${rawMsg}: ${currencySymbol} ${formattedVal}`);
	}
}

function protoPumpBalloon(msElapsed) {

	// Usa a velocidade do slider para qualquer balão
	balloonSize += balloonPumpRate * msElapsed;
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
	const throttlePct = getThrottlePct(balloonPumpRate);
	pumpRates.push(balloonPumpRate);
	pumpThrottlePercentages.push(throttlePct);
	currentBalloonPumpRates.push(balloonPumpRate);
	currentBalloonPumpThrottlePercentages.push(throttlePct);
	const m = getRandomItem(balloonDurabilityState);
	if (m === 0) {
		popBalloon();
	}
}

function popBalloon() {
	popSound.play();
	balloon.setVisible(false);

	const expX = balloon.x;
	const expY = balloon.y - balloon.displayHeight / 2;
	const scale = balloon.scaleX;

	// Create explosion sprite for 3-frame animation
	const explosion = scene.add.image(expX, expY, 'explosion-yelloww');
	explosion.setOrigin(0.5, 0.5);
	explosion.setScale(0);
	explosion.setAlpha(1);

	// Frame 1 (0-150ms): Flash-in — quick scale up with bright white tint
	scene.tweens.add({
		targets: explosion,
		scaleX: scale * 0.5,
		scaleY: scale * 0.5,
		duration: 150,
		ease: 'Back.easeOut',
		onStart: () => { explosion.setTint(0xffffff); },
		onComplete: () => {
			// Frame 2 (150-350ms): Expansion with rotation wobble, tint shift
			explosion.clearTint();
			scene.tweens.add({
				targets: explosion,
				scaleX: scale * 0.8,
				scaleY: scale * 0.8,
				angle: { from: -15, to: 15 },
				duration: 200,
				ease: 'Sine.easeInOut',
				onComplete: () => {
					// Frame 3 (350-600ms): Dissipation — scale up and fade out
					scene.tweens.add({
						targets: explosion,
						scaleX: scale * 1.2,
						scaleY: scale * 1.2,
						alpha: 0,
						angle: 0,
						duration: 250,
						ease: 'Quad.easeOut',
						onComplete: () => {
							explosion.destroy();
							resetBalloon();
						}
					});
				}
			});
		}
	});

	// Debris particles flying outward
	const particleCount = 10;
	const debrisColors = [0xff4444, 0xffaa00, 0xffff00, 0xff6600, 0xffcc00];
	for (let i = 0; i < particleCount; i++) {
		const angle = (Math.PI * 2 * i) / particleCount;
		const radius = (80 + Math.random() * 120) * scale;
		const particle = scene.add.circle(
			expX, expY,
			4 + Math.random() * 6,
			debrisColors[i % debrisColors.length]
		);
		scene.tweens.add({
			targets: particle,
			x: expX + Math.cos(angle) * radius,
			y: expY + Math.sin(angle) * radius,
			alpha: 0,
			scaleX: 0.2,
			scaleY: 0.2,
			duration: 400 + Math.random() * 200,
			ease: 'Quad.easeOut',
			delay: 100,
			onComplete: () => { particle.destroy(); }
		});
	}

	balloonScores.push(0);
	balloonExplosions.push(currentScore);
	balloonPumpRates.push([...currentBalloonPumpRates]);
	balloonPumpThrottlePercentages.push([...currentBalloonPumpThrottlePercentages]);
	currentBalloonPumpRates = [];
	currentBalloonPumpThrottlePercentages = [];
	updateSessionRecord();

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
		pumpRates: pumpRates,
		pumpThrottlePercentages: pumpThrottlePercentages,
		balloonPumpRates: balloonPumpRates,
		balloonPumpThrottlePercentages: balloonPumpThrottlePercentages,
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
	balloonPumpRates.push([...currentBalloonPumpRates]);
	balloonPumpThrottlePercentages.push([...currentBalloonPumpThrottlePercentages]);
	currentBalloonPumpRates = [];
	currentBalloonPumpThrottlePercentages = [];
	updateSessionRecord();
	resetBalloon();
}

function resetBalloon() {
	if (gameOver) return;

	disablePumping();

	// Verifica se acabou a sequência de balões
	if (currentBalloonIndex >= balloonSchedule.length) {
		setGameOver();
		return;
	}

	// Reset do estado do balão
	balloonSize = gameConstants.balloonInitialSize;
	pumpCount = 0;
	currentScore = 0;

	setCurrentScore(currentScore);

	// Define a cor e durabilidade do próximo balão
	currentColorIndex = balloonSchedule[currentBalloonIndex];
	balloonDurabilityState = Array.from(Array(balloonDurabilities[currentColorIndex]).keys());

	// Atualiza o balão na tela
	balloon.setOrigin(0.5, 1.0);
	balloon.setScale(balloonSize);
	balloon.setTint(balloonColors[currentColorIndex]);
	balloon.setVisible(true);

	currentBalloonIndex++;
	balloonCounterText.setText(`${currentBalloonIndex}/${balloonSchedule.length}`);
}

function setGameOver() {
	gameOver = true;
	balloon.destroy();
	balloonCounterText.destroy();
	currentScoreText.destroy();
	helperText.setText(messageMap["GAME_OVER"]);

	setTimeout(() => {
		getHighscores(
			"bart",
			"experiment_payload -> totalScore",
			false
		).then((scores) => {
			displayHighscores(scores);
		});
	}, 2000);
}

function displayHighscores(scores) {
	// Dark translucent container panel for contrast against background image
	const cardW = W * 0.7;
	const cardH = H * 0.78;
	const cardX = (W - cardW) / 2;
	const cardY = (H - cardH) / 2;

	const cardBg = scene.add.graphics();
	cardBg.fillStyle(0x0f172a, 0.88); // Dark slate background with 88% opacity
	cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 20);
	cardBg.lineStyle(3, 0x38bdf8, 0.9); // Sky blue border
	cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 20);

	// Title
	const rawTitle = messageMap["HIGHSCORES_TITLE"] || 'HIGHSCORES';
	const titleText = rawTitle.trim().replace(/:$/, '');
	scene.add.text(W * 0.5, cardY + 30, titleText, {
		fontSize: '42px',
		fill: '#38bdf8',
		fontStyle: 'bold'
	}).setOrigin(0.5, 0);

	// Column Headers (Tighter horizontal spacing, larger font)
	const headerY = cardY + 100;
	const headerStyle = { fontSize: '30px', fill: '#ffd700', fontStyle: 'bold' };

	const colRank = W * 0.22;
	const colName = W * 0.30;
	const colScore = W * 0.52;
	const colDate = W * 0.68;

	scene.add.text(colRank, headerY, '#', headerStyle).setOrigin(0.5, 0);
	scene.add.text(colName, headerY, activeLang === 'pt-br' ? 'NOME' : 'NAME', headerStyle).setOrigin(0, 0);
	scene.add.text(colScore, headerY, activeLang === 'pt-br' ? 'PONTUAÇÃO' : 'SCORE', headerStyle).setOrigin(0, 0);
	scene.add.text(colDate, headerY, activeLang === 'pt-br' ? 'DATA' : 'DATE', headerStyle).setOrigin(0, 0);

	// Divider line under headers
	const div = scene.add.graphics();
	div.lineStyle(2, 0x334155, 1);
	div.lineBetween(cardX + 40, headerY + 45, cardX + cardW - 40, headerY + 45);

	// Table Rows (Larger readable font, 7 rows max)
	let y = headerY + 60;
	const rowStyle = { fontSize: '26px', fill: '#f8fafc' };
	const topScores = (scores || []).slice(0, 7);

	topScores.forEach((scoreObj, i) => {
		const nick = scoreObj.nickname || 'Anonymous';
		const scoreVal = scoreObj.experiment_payload?.totalScore ?? scoreObj.experiment_payload ?? 0;
		const numVal = typeof scoreVal === 'number' ? scoreVal.toFixed(2) : scoreVal;
		const rawTotalMsg = messageMap['TOTAL_SCORE'] || '$XXX';
		const formattedScore = rawTotalMsg.includes('XXX') ? rawTotalMsg.replace('XXX', numVal) : `${currencySymbol} ${numVal}`;

		let dateStr = 'N/A';
		if (scoreObj.db_timestamp) {
			dateStr = new Date(scoreObj.db_timestamp).toISOString().split('T')[0];
		}

		scene.add.text(colRank, y, `${i + 1}`, rowStyle).setOrigin(0.5, 0);
		scene.add.text(colName, y, nick, rowStyle).setOrigin(0, 0);
		scene.add.text(colScore, y, formattedScore, rowStyle).setOrigin(0, 0);
		scene.add.text(colDate, y, dateStr, rowStyle).setOrigin(0, 0);
		y += 48;
	});

	// Balloon-Themed Reboot Button positioned safely inside card bottom
	createThemedRebootButton(scene, W * 0.5, cardY + cardH - 55, () => {
		currentScore = 0;
		totalScore = 0;
		currentBalloonIndex = 0;
		balloonScores = [];
		balloonExplosions = [];
		pumpRates = [];
		pumpThrottlePercentages = [];
		currentBalloonPumpRates = [];
		currentBalloonPumpThrottlePercentages = [];
		balloonPumpRates = [];
		balloonPumpThrottlePercentages = [];
		gameOver = false;
		scene.scene.start('InstructionsScene');
	});
}

function createThemedRebootButton(scene, x, y, onRebootCallback) {
	if (!scene || !scene.add) return;
	const button = scene.add.rectangle(x, y, 320, 65, 0xff5733, 1).setInteractive({ useHandCursor: true }).setOrigin(0.5);
	button.setStrokeStyle(4, 0xffd700);

	const rebootLabel = activeLang === 'pt-br' ? '🎈 REINICIAR TESTE' : '🎈 REBOOT TEST';
	const text = scene.add.text(x, y, rebootLabel, { fontSize: '26px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

	button.on('pointerover', () => {
		button.setFillStyle(0xff7043);
		button.setScale(1.06);
		text.setScale(1.06);
	});
	button.on('pointerout', () => {
		button.setFillStyle(0xff5733);
		button.setScale(1.0);
		text.setScale(1.0);
	});
	button.on('pointerdown', () => {
		if (onRebootCallback) onRebootCallback();
	});

	if (scene.input && scene.input.keyboard) {
		const rKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
		rKey.once('down', () => {
			if (onRebootCallback) onRebootCallback();
		});
	}

	return { button, text };
}
  
function getRandomItem(arr) {
	const randomIndex = Math.floor(Math.random() * arr.length);
	const item = arr[randomIndex];
	arr.splice(randomIndex, 1);
	return item;
}