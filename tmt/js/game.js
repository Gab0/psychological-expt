
import {
    PsyExpBaseConfig,
    db,
    makeid,
    nickname,
    fetchMessages,
    font,
    StandardBriefingScene,
    updateDatabase,
    getHighscores
} from '../../psyexp_core.js';

document.title = 'Trail Making Test (TMT)';

class TMTScene extends Phaser.Scene {
	constructor(markers, sceneName) {
		super({ key: sceneName });
		this.circleData = [];
		this.circleRadius = 30;
		this.currentCircle = 0;
		this.lines = [];
		this.isDrawing = false;
		this.isGameEnded = false;
		this.isPaused = true;
		this.minDistance = this.circleRadius * 3;
		this.lastCircle = null;
		this.wrongCircle = null;
		this.startTime = 0;

        this.markers = markers;

	}

	create() {
		this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });
		this.timeText = this.add.text(700, 16, 'Time: 0.00', { fontSize: '32px', fill: '#ffffff' });
		this.timeText.setOrigin(1, 0);

		for (let i = 0; i < 25; i++) {
			this.createUniqueCircle(i, this.markers[i]);
		}

		this.isPaused = false;
		this.startTime = this.time.now;

        userMetrics[this.scene.key] = [];
	}

	update(time) {
		if (!this.isPaused && !this.isGameEnded) {
			let elapsed = (time - this.startTime) / 1000;
			this.timeText.setText('Time: ' + elapsed.toFixed(2));
		}
	}

	createUniqueCircle(index, content) {
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

		this.createCircle(x, y, index, content);
	}

	createCircle(x, y, index, content) {
		let circle = this.add.circle(x, y, this.circleRadius, 0xffffff);
		let text = this.add.text(x, y, content, { fontSize: '32px', fill: '#000' });
		text.setOrigin(0.5, 0.5);
		circle.setInteractive();
		circle.num = index;
		circle.on('pointerdown', () => this.onCircleClick(circle), this);
		circle.text = text;
		this.circleData.push({ circle, text, x, y, num: index });
	}

    checkCorrectCircle(circle) {
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

        userMetrics[this.scene.key].push(this.time.now - this.startTime);
    }

	onCircleClick(circle) {
		if (this.isPaused || this.isGameEnded) return;
		if (circle.num === this.currentCircle) {
			this.checkCorrectCircle(circle);
		} else {
			if (this.wrongCircle) {
				this.wrongCircle.setFillStyle(0xffffff);
			}
			circle.setFillStyle(0xff0000);
			this.wrongCircle = circle;
		}
		if (this.currentCircle >= this.circleData.length) {
			this.endGame(true);
		}
	}

	endGame(success) {
		if (success) {
			this.add.text(M, 450, 'Test Completed!', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5, 0.5);

            this.updateDatabase();

            if (this.scene.key === "SceneA") {
				this.scene.start("SceneB");
			}
          
            this.highscores();
		} else {
			this.add.text(M, 450, 'Test Failed!', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5, 0.5);
		}
		this.circleData.forEach(({ circle }) => {
			circle.disableInteractive();
		});
	}

    updateDatabase() {
        const totalTimes = objectMap(userMetrics, (times) => times[times.length-1])
        const experimentPayload = {
            nodeTimes: userMetrics,
            totalTimes: totalTimes,
            combinedTimes: totalTimes["SceneA"] + totalTimes["SceneB"]
        };

        updateDatabase(
            experimentPayload,
            "tmt"
        )
    }

    highscores() {
        setTimeout(
            getHighscores("tmt", "experiment_payload -> combinedTimes")
                .then((scores) => {
                    this.displayHighscores(scores);
                }),
            2000
        );
    }

    displayHighscores(scores) {
        let y = H * 0.23;
        let i = 1;
        scores.map((score) => {
            let v = score.experiment_payload.combinedTimes;
            if (v === undefined) return;

            this.add.text(W * 0.2, y, `${i}.`, font.larger);
            this.add.text(W * 0.3, y, `${score.nickname}`, font.larger);
            this.add.text(W * 0.7, y, `${(v / 1000).toFixed(2)}s`, font.larger);
            i++;
            y += H * 0.05;
        });
    };

}

function objectMap(obj, fn) {
  const newObject = {};
  Object.keys(obj).forEach((key) => {
    newObject[key] = fn(obj[key]);
  });
  return newObject;
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

const mixed = [];
for (let i = 0; i < 25; i++) {
	mixed.push(numbers[i]);
	mixed.push(letters[i]);
}

const userMetrics = {};

const roundA = new TMTScene(numbers, "SceneA");
const roundB = new TMTScene(mixed.slice(0, 25), "SceneB");

const config = PsyExpBaseConfig([briefing, roundA, roundB]);

const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;
const M = W * 0.5;
const Y = H * 0.8;

