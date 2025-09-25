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
        this.paths = [];
        this.isDrawing = false;
        this.isGameEnded = false;
        this.isPaused = true;
        this.minDistance = this.circleRadius * 3;
        this.lastCircle = null;
        this.startTime = 0;
        this.markers = markers;
        this.currentPath = [];
        this.currentStep = 0;
        this.lastErrorCircle = null;
    }

    create() {
        this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });
        this.timeText = this.add.text(700, 16, 'Time: 0.00', { fontSize: '32px', fill: '#ffffff' });
        this.timeText.setOrigin(1, 0);

        for (let i = 0; i < this.markers.length; i++) {
            this.createUniqueCircle(i, this.markers[i]);
        }

        this.isPaused = false;
        this.startTime = this.time.now;
        userMetrics[this.scene.key] = [];

        this.input.on('pointerdown', this.startDrawing, this);
        this.input.on('pointermove', this.updateDrawing, this);
        this.input.on('pointerup', this.stopDrawing, this);
    }

    update(time) {
        if (!this.isPaused && !this.isGameEnded) {
            let elapsed = (time - this.startTime) / 1000;
            this.timeText.setText('Time: ' + elapsed.toFixed(2));
        }

        if (this.isDrawing) {
            this.redrawGraphics();
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
        circle.text = text;
        this.circleData.push({ circle, text, x, y, num: index });
    }

    startDrawing(pointer) {
        if (this.isPaused || this.isGameEnded || this.isDrawing) return;

        const circle = this.getCircleAt(pointer.x, pointer.y);
        if (!circle) return;

        if (this.scene.key === "SceneB") {
            const expectedIndex = this.currentStep;
            if (circle.num !== expectedIndex) {
                if (circle.fillColor === 0x00ff00) return;
                this.markCircleRed(circle);
                return;
            }

            this.clearErrorCircle();
            this.lastCircle = circle;
            this.markCircleGreen(circle);
        } else {
            if (circle.num !== this.currentCircle) {
                if (circle.fillColor === 0x00ff00) return;
                this.markCircleRed(circle);
                return;
            }

            this.clearErrorCircle();
            this.lastCircle = circle;

            if (this.currentCircle === 0) {
                this.markCircleGreen(circle);
            }
        }

        this.isDrawing = true;
        this.currentPath = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
        this.redrawGraphics();
    }

    updateDrawing(pointer) {
        if (!this.isDrawing) return;

        this.currentPath.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
        this.redrawGraphics();

        if (this.scene.key === "SceneB") {
            const targetCircle = this.getCircleAt(pointer.x, pointer.y);
            if (targetCircle && targetCircle.num === this.currentStep + 1) {
                this.clearErrorCircle();
                this.markCircleGreen(targetCircle);
                this.paths.push(this.currentPath);
                this.currentPath = [];
                this.lastCircle = targetCircle;
                this.currentStep++;

                if (this.currentStep >= this.circleData.length - 1) {
                    this.endGame(true);
                }
            }
        } else {
            const targetCircle = this.getCircleAt(pointer.x, pointer.y);
            if (targetCircle && targetCircle.num === this.currentCircle + 1) {
                this.clearErrorCircle();
                this.markCircleGreen(targetCircle);
                this.paths.push(this.currentPath);
                this.currentPath = [];
                this.lastCircle = targetCircle;
                this.currentCircle++;

                if (this.currentCircle >= this.circleData.length - 1) {
                    this.endGame(true);
                }
            }
        }
    }

    stopDrawing(pointer) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.currentPath = [];
        this.redrawGraphics();
    }

    getCircleAt(x, y) {
        for (let data of this.circleData) {
            const dx = data.x - x;
            const dy = data.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < this.circleRadius) {
                return data.circle;
            }
        }
        return null;
    }

    markCircleGreen(circle) {
        circle.setFillStyle(0x00ff00);
        circle.disableInteractive();
        userMetrics[this.scene.key].push(this.time.now - this.startTime);
    }

    markCircleRed(circle) {
        if (circle.fillColor === 0x00ff00) return;
        if (this.lastErrorCircle && this.lastErrorCircle !== circle) {
            if (this.lastErrorCircle.fillColor !== 0x00ff00) {
                this.lastErrorCircle.setFillStyle(0xffffff);
                this.lastErrorCircle.setInteractive();
            }
        }
        circle.setFillStyle(0xff0000);
        this.lastErrorCircle = circle;
    }

    clearErrorCircle() {
        if (this.lastErrorCircle) {
            if (this.lastErrorCircle.fillColor !== 0x00ff00) {
                this.lastErrorCircle.setFillStyle(0xffffff);
                this.lastErrorCircle.setInteractive();
            }
            this.lastErrorCircle = null;
        }
    }

    redrawGraphics() {
        this.graphics.clear();
        this.graphics.lineStyle(4, 0xffffff, 1);
        for (let path of this.paths) {
            for (let i = 1; i < path.length; i++) {
                this.graphics.strokeLineShape(new Phaser.Geom.Line(
                    path[i - 1].x, path[i - 1].y,
                    path[i].x, path[i].y
                ));
            }
        }
        if (this.isDrawing && !this.isGameEnded && this.currentPath.length > 1) {
            this.graphics.lineStyle(4, 0xffffff, 1);
            for (let i = 1; i < this.currentPath.length; i++) {
                this.graphics.strokeLineShape(new Phaser.Geom.Line(
                    this.currentPath[i - 1].x, this.currentPath[i - 1].y,
                    this.currentPath[i].x, this.currentPath[i].y
                ));
            }
        }
    }

    endGame(success) {
        this.isGameEnded = true;

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
        const totalTimes = objectMap(userMetrics, (times) => times[times.length - 1]);
        const experimentPayload = {
            nodeTimes: userMetrics,
            totalTimes: totalTimes,
            combinedTimes: totalTimes["SceneA"] + totalTimes["SceneB"]
        };

        updateDatabase(experimentPayload, "tmt");
    }

    highscores() {
        setTimeout(() => {
            getHighscores("tmt", "experiment_payload -> combinedTimes")
                .then((scores) => {
                    this.displayHighscores(scores);
                });
        }, 2000);
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
    }
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
const letters = Array.from({ length: 13 }, (_, i) => String.fromCharCode(65 + i));

const mixed = [];
for (let i = 0; i < 13; i++) {
    mixed.push(numbers[i]);
    mixed.push(letters[i]);
}

const userMetrics = {};

const roundA = new TMTScene(numbers, "SceneA");
const roundB = new TMTScene(mixed, "SceneB");

const config = PsyExpBaseConfig([briefing, roundA, roundB]);

const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;
const M = W * 0.5; 
const Y = H * 0.8;