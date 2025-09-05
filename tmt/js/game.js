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

const userMetrics = {};

function objectMap(obj, fn) {
    const newObject = {};
    Object.keys(obj).forEach((key) => {
        newObject[key] = fn(obj[key]);
    });
    return newObject;
}

class TMTScene extends Phaser.Scene {
    constructor(markers, sceneName) {
        super({ key: sceneName });

        this.markers = markers;
        this.circleData = [];
        this.circleRadius = 30;
        this.minDistance = this.circleRadius * 3;

        this.currentCircle = 0;
        this.lastCircle = null;
        this.wrongCircle = null;

        this.isDrawing = false;
        this.isGameEnded = false;
        this.isPaused = true;

        this.startTime = 0;
        this.pointer = null;

        this.drawPath = [];
        this.hasProgressedInCurrentDraw = false;
        this.allDrawPaths = [];
    }

    create() {
        const W = this.sys.game.config.width;

        this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });

        this.timeText = this.add.text(W - 20, 16, 'Time: 0.00', {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(1, 0);

        for (let i = 0; i < 25; i++) {
            this.createUniqueCircle(i, this.markers[i]);
        }

        this.isPaused = false;
        this.startTime = this.time.now;
        userMetrics[this.scene.key] = [];
        this.pointer = this.input.activePointer;

        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
    }

    update(time) {
        if (this.isPaused || this.isGameEnded) return;

        const elapsed = (time - this.startTime) / 1000;
        this.timeText.setText(`Time: ${elapsed.toFixed(2)}`);

        this.graphics.clear();
        this.graphics.lineStyle(4, 0xffffff);

        for (let path of this.allDrawPaths) {
            this.drawPathOnGraphics(path);
        }

        if (this.drawPath.length > 1) {
            this.drawPathOnGraphics(this.drawPath);
        }

        const next = this.circleData[this.currentCircle];
        if (this.pointer.isDown && next?.circle.input?.enabled) {
            const dx = this.pointer.x - next.circle.x;
            const dy = this.pointer.y - next.circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.circleRadius) {
                this.checkCorrectCircle(next.circle);
                this.hasProgressedInCurrentDraw = true;

                if (this.currentCircle >= this.circleData.length) {
                    this.endGame(true);
                }
            }
        }
    }

    // === Interações com mouse ===

    onPointerDown(pointer) {
        if (this.isPaused || this.isGameEnded) return;

        this.isDrawing = true;
        this.hasProgressedInCurrentDraw = false;

        this.drawPath = this.lastCircle
            ? [{ x: this.lastCircle.x, y: this.lastCircle.y }]
            : [{ x: pointer.x, y: pointer.y }];
    }

    onPointerMove(pointer) {
        if (this.isDrawing) {
            this.drawPath.push({ x: pointer.x, y: pointer.y });
        }
    }

    onPointerUp() {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (!this.hasProgressedInCurrentDraw) {
            this.drawPath = this.lastCircle
                ? [{ x: this.lastCircle.x, y: this.lastCircle.y }]
                : [];
        }

        if (this.drawPath.length > 1) {
            this.allDrawPaths.push(this.drawPath);
        }

        this.drawPath = [];
    }

    // === Círculos ===

    createUniqueCircle(index, content) {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;
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
        const circle = this.add.circle(x, y, this.circleRadius, 0xffffff);
        const text = this.add.text(x, y, content, {
            fontSize: '32px',
            fill: '#000'
        }).setOrigin(0.5);

        circle.setInteractive();
        circle.num = index;
        circle.text = text;

        circle.on('pointerdown', () => this.onCircleClick(circle), this);

        this.circleData.push({ circle, text, x, y, num: index });
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

    checkCorrectCircle(circle) {
        circle.setFillStyle(0x00ff00);
        circle.disableInteractive();
        this.lastCircle = circle;
        this.currentCircle++;

        if (this.wrongCircle) {
            this.wrongCircle.setFillStyle(0xffffff);
            this.wrongCircle = null;
        }

        userMetrics[this.scene.key].push(this.time.now - this.startTime);

        if (this.drawPath.length > 1) {
            this.allDrawPaths.push(this.drawPath);
        }

        this.drawPath = [];
        this.isDrawing = false;
    }

    drawPathOnGraphics(path) {
        this.graphics.beginPath();
        this.graphics.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            this.graphics.lineTo(path[i].x, path[i].y);
        }
        this.graphics.strokePath();
    }

    // === Fim de jogo ===

    endGame(success) {
        const midX = this.sys.game.config.width * 0.5;
        const color = success ? '#ffffff' : '#ff0000';
        const msg = success ? 'Test Completed!' : 'Test Failed!';

        this.add.text(midX, 450, msg, {
            fontSize: '32px',
            fill: color
        }).setOrigin(0.5);

        this.circleData.forEach(({ circle }) => circle.disableInteractive());
        this.isGameEnded = true;

        if (success) {
            this.updateDatabase();
            if (this.scene.key === 'SceneA') {
                this.scene.start('SceneB');
            }
            this.highscores();
        }
    }

    updateDatabase() {
        const totalTimes = objectMap(userMetrics, (times) => times[times.length - 1]);

        const experimentPayload = {
            nodeTimes: userMetrics,
            totalTimes,
            combinedTimes: totalTimes['SceneA'] + totalTimes['SceneB']
        };

        updateDatabase(experimentPayload, 'tmt');
    }

    highscores() {
        setTimeout(() => {
            getHighscores('tmt', 'experiment_payload -> combinedTimes')
                .then((scores) => this.displayHighscores(scores));
        }, 2000);
    }

    displayHighscores(scores) {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;
        let y = H * 0.23;
        let i = 1;

        for (const score of scores) {
            const v = score.experiment_payload.combinedTimes;
            if (v === undefined) continue;

            this.add.text(W * 0.2, y, `${i}.`, font.larger);
            this.add.text(W * 0.3, y, `${score.nickname}`, font.larger);
            this.add.text(W * 0.7, y, `${(v / 1000).toFixed(2)}s`, font.larger);

            i++;
            y += H * 0.05;
        }
    }
}

// === Inicialização ===

const messageMap = await fetchMessages("pt-br", "tmt");

const briefing = new StandardBriefingScene(
    'Trail Making Test',
    [messageMap["BRIEFING_1"], messageMap["BRIEFING_2"]],
    'BriefingScene',
    'SceneA'
);

const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
const letters = Array.from({ length: 25 }, (_, i) => String.fromCharCode(65 + i));
const mixed = [];

for (let i = 0; i < 25; i++) {
    mixed.push(numbers[i]);
    mixed.push(letters[i]);
}

const roundA = new TMTScene(numbers, "SceneA");
const roundB = new TMTScene(mixed.slice(0, 25), "SceneB");

const config = PsyExpBaseConfig([briefing, roundA, roundB]);

const game = new Phaser.Game(config);