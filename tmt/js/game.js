
import { PsyExpBaseConfig, db, makeid, nickname, fetchMessages, font, StandardBriefingScene } from '../../psyexp_core.js';

document.title = 'Trail Making Test (TMT)';

class TMTScene extends Phaser.Scene {
	constructor(markers, sceneName) {
		super({ key: sceneName });
		this.circleData = [];
		this.circleRadius = 30;
		this.currentCircle = 1;
		this.lines = [];
		this.isDrawing = false;
		this.isGameEnded = false;
		this.isPaused = true;
		this.minDistance = this.circleRadius * 3;
		this.lastCircle = null;
		this.wrongCircle = null;
		this.startTime = 0;
	}

	preload() {
		this.load.image('circle', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'); // Simple placeholder image
	}

	create() {
		this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });
		this.timeText = this.add.text(700, 16, 'Time: 0.00', { fontSize: '32px', fill: '#ffffff' });
		this.timeText.setOrigin(1, 0);

		for (let i = 0; i < 25; i++) {
			this.createUniqueCircle(i + 1);
		}
				this.isPaused = false;
				this.startTime = this.time.now;
	}

	update(time) {
		if (!this.isPaused && !this.isGameEnded) {
			let elapsed = (time - this.startTime) / 1000;
			this.timeText.setText('Time: ' + elapsed.toFixed(2));
		}
	}

	createUniqueCircle(number) {
		let x, y, overlap;
		do {
			overlap = false;
			x = Phaser.Math.Between(W * 0.1, W * 0.9);
			y = Phaser.Math.Between(H * 0.1, H * 0.9);

			for (let circle of this.circleData) {
				if (Phaser.Math.Distance.Between(circle.x, circle.y, x, y) < this.minDistance) {
					overlap = true;
					break;
				}
			}
		} while (overlap);

		this.createCircle(x, y, number);
	}

	createCircle(x, y, number) {
		let circle = this.add.circle(x, y, this.circleRadius, 0xffffff);
		let text = this.add.text(x, y, number, { fontSize: '32px', fill: '#000' });
		text.setOrigin(0.5, 0.5);
		circle.setInteractive();
		circle.num = number;
		circle.on('pointerdown', () => this.onCircleClick(circle), this);
		circle.text = text;
		this.circleData.push({ circle, text, x, y, num: number });
	}

	onCircleClick(circle) {
		if (this.isPaused || this.isGameEnded) return;
		if (circle.num === this.currentCircle) {
			if (this.lastCircle) {
				let line = new Phaser.Geom.Line(this.lastCircle.x, this.lastCircle.y, circle.x, circle.y);
				this.lines.push(line);
				this.graphics.strokeLineShape(line);
			}
			circle.setFillStyle(0x00ff00);
			circle.disableInteractive();
			this.lastCircle = circle;
			this.currentCircle++;
			if (this.wrongCircle) {
				this.wrongCircle.setFillStyle(0xffffff);
				this.wrongCircle = null;
			}
		} else {
			if (this.wrongCircle) {
				this.wrongCircle.setFillStyle(0xffffff);
			}
			circle.setFillStyle(0xff0000);
			this.wrongCircle = circle;
		}
		if (this.currentCircle > this.circleData.length) {
			this.endGame(true);
		}
	}

	endGame(success) {
		if (success) {
			this.add.text(M, 450, 'Test Completed!', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5, 0.5);
            if (this.scene.key === "SceneA") {
				this.scene.start("SceneB");
			}
            this.scene.stop();
		} else {
			this.add.text(M, 450, 'Test Failed!', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5, 0.5);
		}
		this.circleData.forEach(({ circle }) => {
			circle.disableInteractive();
		});
	}
}

const messageMap = await fetchMessages("pt-br", "tmt");
const briefing = new StandardBriefingScene(
    'Trail Making Test',
    [messageMap["BRIEFING_1"], messageMap["BRIEFING_2"]],
    'BriefingScene',
    'SceneA',
);


const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
const letters = Array.from({ length: 25 }, (_, i) => String.fromCharCode(65 + i));

const roundA = new TMTScene(numbers, "SceneA");
const roundB = new TMTScene(letters, "SceneB");

const config = PsyExpBaseConfig([briefing, roundA, roundB]);

const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;
const M = W * 0.5;
const Y = H * 0.8;
