
import { PsyExpBaseConfig, StandardBriefingScene, db, makeid, nickname, fetchMessages, font } from '../../psyexp_core.js';

const urlParams = new URLSearchParams(window.location.search);

let moveText;
let timerText;

let scene = null;
const messageMap = await fetchMessages("pt-br", "hanoi");


class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
        scene = this;
    }

    preload() {
        //this.load.image('disk1', 'disk1.png');
        //this.load.image('disk2', 'disk2.png');
        //this.load.image('disk3', 'disk3.png');
    }

    create() {

        this.gameState = {
            runId: makeid(10),
            diskCount: parseInt(urlParams.get('ndisk'), 10) || 5,
            poles: [],
            disks: [],
            timestamps: [],
            moveCount: 0,
            timer: null,
            lastTime: 0,
            startTime: 0,
            currentDraggedDisk: null
        };

        const background = this.add.rectangle(0, 0, W, H, 0x010101);
        background.setOrigin(0, 0);
        background.setInteractive();
        this.input.setDraggable(background, true);

        displayRebootButton();

        //this.add.text(W * 0.5, H * 0.1, 'Tower of Hanoi', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        //this.add.text(W * 0.5, H * 0.15, 'Drag and drop the this.gameState.disks to the rightmost pole to solve the puzzle.', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(W * 0.7, H * 0.05, nickname, font.larger).setOrigin(0.5);

        this.gameState.poles = pole_pos.map((x) => this.add.rectangle(x, pole_base, 20, pole_height, 0x6666ff))

        this.add.rectangle(W * 0.5, Y, W * 0.8, 30, 0x964b00);


        const diskColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];

        for (let i = 0; i < this.gameState.diskCount; i++) {
            const x = pole_pos[0];
            const z = i + 1;
            const disk = this.add.rectangle(x, Y - z * 30, 300 - i * 30, 30, diskColors[i % diskColors.length]);
            this.gameState.disks.push(disk);
        }

        const getTopDiskToDrag = (x, y) => {
            // if (y < pole_base || y > pole_base + pole_height) {
            //      return null;
            // }

            for (const pole of this.gameState.poles) {
                const distance = Math.abs(x - pole.x);
                if (distance <= pole_tolerance) {
                    return getTopDisk(this.gameState.poles.indexOf(pole));
                }
            }

            return null;
        };

        this.input.on('dragstart', function (pointer, gameObject) {

            const topDisk = getTopDiskToDrag(pointer.x, pointer.y);

            if (!topDisk) {
                return;
            }

            topDisk.setData('startX', topDisk.x);
            topDisk.setData('startY', topDisk.y);

            this.gameState.currentDraggedDisk = topDisk;

        }.bind(this));

        this.input.on('drag', function (pointer, gameObject) {
            if (!this.gameState.currentDraggedDisk) {
                return;
            }

            this.gameState.currentDraggedDisk.x = pointer.x;
            this.gameState.currentDraggedDisk.y = pointer.y;
        }.bind(this));

        this.input.on('dragend', function (pointer, gameObject) {
            if (!this.gameState.currentDraggedDisk) {
                return;
            }

            let placed = false;
            for (const pole of this.gameState.poles) {
                if (Math.abs(this.gameState.currentDraggedDisk.x - pole.x) <= pole_tolerance) {
                    const poleIndex = this.gameState.poles.indexOf(pole);
                    const topDisk = getTopDisk(poleIndex);
                    if (!topDisk || this.gameState.currentDraggedDisk.width < topDisk.width) {
                        this.gameState.currentDraggedDisk.x = pole.x;
                        this.gameState.currentDraggedDisk.y = Y - getDisksOnPole(poleIndex) * 30;
                        placed = true;
                        break;
                    }
                }
            }
            if (!placed) {
                this.gameState.currentDraggedDisk.x = this.gameState.currentDraggedDisk.getData('startX');
                this.gameState.currentDraggedDisk.y = this.gameState.currentDraggedDisk.getData('startY');
            } else {
                if (this.gameState.currentDraggedDisk.x !== this.gameState.currentDraggedDisk.getData('startX')) {
                    this.gameState.moveCount++;
                }
                this.gameState.timestamps.push(new Date());
                moveText.setText('Moves: ' + this.gameState.moveCount);
                if (checkWinCondition()) {
                    triggerWin(this.gameState.currentDraggedDisk.scene);
                };
            }
            this.gameState.currentDraggedDisk = null;
        }.bind(this));

        moveText = this.add.text(W * 0.1, 16, 'Moves: 0', { fontSize: '32px', fill: '#fff' });
        timerText = this.add.text(W * 0.1, 50, 'Time: 0', { fontSize: '32px', fill: '#fff' });

        this.gameState.startTime = new Date();
        this.gameState.timer = this.time.addEvent({ delay: 100, callback: updateTimer.bind(this), callbackScope: this, loop: true });
}

    update() {}

}

const briefing = new StandardBriefingScene(
    "Tower of Hanoi",
    [messageMap["BRIEFING_1"], messageMap["BRIEFING_2"]],
    "Briefing",
    "GameScene"
);

const config = PsyExpBaseConfig([briefing, GameScene]);
const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;
const Y = H * 0.8;

const pole_pos = [W * 0.33, W * 0.5, W * 0.66];
const pole_tolerance = W * 0.10;
const pole_base = Y / 1.45;
const pole_height = 500;

function getTopDisk(poleIndex) {
    return scene.gameState.disks.filter(disk => disk.x === scene.gameState.poles[poleIndex].x).sort((a, b) => a.y - b.y)[0];
}

function getDisksOnPole(poleIndex) {
    return scene.gameState.disks.filter(disk => disk.x === scene.gameState.poles[poleIndex].x).length;
}

function checkWinCondition() {
    const thirdPoleDisks = scene.gameState.disks.filter(disk => disk.x === scene.gameState.poles[2].x).sort((a, b) => a.y - b.y);
    if (thirdPoleDisks.length === scene.gameState.diskCount) {
        return true;
    }
}

function triggerWin(scene) {
    scene.add.text(W * 0.5, H * 0.2, 'You Win!', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
    scene.gameState.timer.paused = true;
    updateDatabase(scene.gameState);

    scene.time.delayedCall(500, () => {
        getHighscores(scene).then((scores) => {
            displayHighscores(scores);
        });
    });

}

function updateTimer() {
    this.gameState.lastTime = getElapsedTime();
    timerText.setText('Time: ' + this.gameState.lastTime + 's');
}

function getElapsedTime() {
    return ((new Date() - scene.gameState.startTime) / 1000).toFixed(2);
}

async function updateDatabase(gameState) {

    const res = await db.from('hanoi_runs').insert({
        id: gameState.runId,
        useragent: window.navigator.userAgent,
        nickname: nickname,
        nb_disk: gameState.diskCount,
        nb_move: gameState.moveCount,
        elapsed_time: gameState.lastTime,
        timestamps: gameState.timestamps
    });

    console.log(res);

}

export async function getHighscores(scene) {
    const {data, error} = await db.from('hanoi_highscores').select().neq("nickname", null).eq("nb_disk", scene.gameState.diskCount).limit(15);
    console.log(error);
    console.log(data);
    return data;
}

function displayHighscores(scores) {
    const highscoreText = scene.add.text(W * 0.18, H * 0.23, messageMap["HIGHSCORES_TITLE"], font.larger);
    let y = H * 0.28;
    scores.map((score, i) => {
        scene.add.text(W * 0.25, y + 40 * i, `${i + 1}.`, font.normal);
        scene.add.text(W * 0.33, y + 40 * i, `${score.nickname}`, font.normal);
        scene.add.text(W * 0.59, y + 40 * i, `${score.nb_move}`, font.normal);
        scene.add.text(W * 0.64, y + 40 * i, `${score.elapsed_time.toFixed(2)}s`, font.normal);
    });
}

function displayRebootButton() {
    const rebootButton = scene.add.rectangle(W * 0.9, H * 0.1, W * 0.05, H * 0.05, 0x40ff40).setOrigin(0, 0).setInteractive();
    rebootButton.depth = 100;
    rebootButton.on('pointerdown', triggerReboot);
}

function triggerReboot() {

    let rebootAborted = false;
    const rebootText = scene.add.text(W * 0.5, H * 0.5, 'Rebooting in 2 seconds, click to abort', font.larger).setOrigin(0.5).setInteractive();
    rebootText.on('pointerdown', () => {
        rebootAborted = true;
        rebootText.destroy();
    });
    scene.time.delayedCall(2000, () => {
        if (!rebootAborted) {
            scene.scene.start('GameScene');
        } else {
            rebootText.destroy();
        }
        
    });

}
