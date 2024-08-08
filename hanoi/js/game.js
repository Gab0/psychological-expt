
import { PsyExpBaseConfig, db, run_id, nickname, fetchMessages, font } from '../../psyexp_core.js';


let poles = [];
let disks = [];
let timestamps = [];
let moveCount = 0;
let moveText;
let timer;
let lastTime;
let timerText;
let startTime;

const urlParams = new URLSearchParams(window.location.search);
const diskCount = parseInt(urlParams.get('ndisk'), 10) || 5;

let currentDraggedDisk = null;

let scene = null;
const messageMap = await fetchMessages("pt-br");

class Briefing extends Phaser.Scene {

	constructor() {
		super({ key: 'Briefing' });
	}

    create() {
        this.add.text(W * 0.5, H * 0.1, 'Tower of Hanoi', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(W * 0.5, H * 0.5, messageMap["BRIEFING_1"], { fontSize: '50px', fill: '#ff0000' }).setOrigin(0.5);

		this.input.on('pointerdown', () => {
            this.scene.start('Briefing2');
		});
    }
}

class Briefing2 extends Phaser.Scene {

    constructor() {
        super({ key: 'Briefing2' });
    }

    create() {
        this.add.text(W * 0.5, H * 0.5, messageMap["BRIEFING_2"], { fontSize: '50px', fill: '#ff0000' }).setOrigin(0.5);

        this.input.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

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

        const background = this.add.rectangle(0, 0, W, H, 0x010101);
        background.setOrigin(0, 0);
        background.setInteractive();
        this.input.setDraggable(background, true);


        //this.add.text(W * 0.5, H * 0.1, 'Tower of Hanoi', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        //this.add.text(W * 0.5, H * 0.15, 'Drag and drop the disks to the rightmost pole to solve the puzzle.', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(W * 0.7, H * 0.05, nickname, { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5);

        poles = pole_pos.map((x) => this.add.rectangle(x, pole_base, 20, pole_height, 0x6666ff))

        this.add.rectangle(W * 0.5, Y, W * 0.8, 30, 0x964b00);


        const diskColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];

        for (let i = 0; i < diskCount; i++) {
            const x = pole_pos[0];
            const z = i + 1;
            const disk = this.add.rectangle(x, Y - z * 30, 300 - i * 30, 30, diskColors[i % diskColors.length]);
            disks.push(disk);
        }

        const getTopDiskToDrag = (x, y) => {
            // if (y < pole_base || y > pole_base + pole_height) {
            //      return null;
            // }

            for (const pole of poles) {
                const distance = Math.abs(x - pole.x);
                if (distance <= pole_tolerance) {
                    return getTopDisk(poles.indexOf(pole));
                }
            }

            return null;
        };

        this.input.on('dragstart', function (pointer, gameObject) {

            console.log("dragstart x", pointer.x);
            const topDisk = getTopDiskToDrag(pointer.x, pointer.y);

            if (!topDisk) {
                return;
            }

            topDisk.setData('startX', topDisk.x);
            topDisk.setData('startY', topDisk.y);

            currentDraggedDisk = topDisk;

        });

        this.input.on('drag', function (pointer, gameObject) {
            if (!currentDraggedDisk) {
                return;
            }

            currentDraggedDisk.x = pointer.x;
            currentDraggedDisk.y = pointer.y;
        });

        this.input.on('dragend', function (pointer, gameObject) {
            if (!currentDraggedDisk) {
                return;
            }

            let placed = false;
            for (const pole of poles) {
                if (Math.abs(currentDraggedDisk.x - pole.x) <= pole_tolerance) {
                    const poleIndex = poles.indexOf(pole);
                    const topDisk = getTopDisk(poleIndex);
                    if (!topDisk || currentDraggedDisk.width < topDisk.width) {
                        currentDraggedDisk.x = pole.x;
                        currentDraggedDisk.y = Y - getDisksOnPole(poleIndex) * 30;
                        placed = true;
                        break;
                    }
                }
            }
            if (!placed) {
                currentDraggedDisk.x = currentDraggedDisk.getData('startX');
                currentDraggedDisk.y = currentDraggedDisk.getData('startY');
            } else {
                moveCount++;
                timestamps.push(new Date());
                moveText.setText('Moves: ' + moveCount);
                if (checkWinCondition()) {
                    triggerWin(currentDraggedDisk.scene);
                };
            }
            currentDraggedDisk = null;
        });

        moveText = this.add.text(W * 0.1, 16, 'Moves: 0', { fontSize: '32px', fill: '#fff' });
        timerText = this.add.text(W * 0.1, 50, 'Time: 0', { fontSize: '32px', fill: '#fff' });

        startTime = new Date();
        timer = this.time.addEvent({ delay: 100, callback: updateTimer, callbackScope: this, loop: true });
}

    update() {}

}

const config = PsyExpBaseConfig([Briefing, Briefing2, GameScene]);
const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;
const Y = H * 0.8;

const pole_pos = [W * 0.33, W * 0.5, W * 0.66];
const pole_tolerance = W * 0.10;
const pole_base = Y / 1.45;
const pole_height = 500;

function getTopDisk(poleIndex) {
    return disks.filter(disk => disk.x === poles[poleIndex].x).sort((a, b) => a.y - b.y)[0];
}

function getDisksOnPole(poleIndex) {
    return disks.filter(disk => disk.x === poles[poleIndex].x).length;
}

function checkWinCondition() {
    const thirdPoleDisks = disks.filter(disk => disk.x === poles[2].x).sort((a, b) => a.y - b.y);
    if (thirdPoleDisks.length === diskCount) {
        return true;
    }
}

function triggerWin(scene) {
    scene.add.text(W * 0.5, H * 0.2, 'You Win!', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
    timer.paused = true;
    scene.input.enabled = false;
    updateDatabase();

	setTimeout(getHighscores().then((scores) => {
		displayHighscores(scores);
	}), 2000);

}

function updateTimer() {
    lastTime = getElapsedTime();
    timerText.setText('Time: ' + lastTime + 's');
}

function getElapsedTime() {
    return ((new Date() - startTime) / 1000).toFixed(2);
}

async function updateDatabase() {

    const res = await db.from('hanoi_runs').insert({
        id: run_id,
        useragent: window.navigator.userAgent,
        nickname: nickname,
        nb_disk: diskCount,
        nb_move: moveCount,
        elapsed_time: lastTime,
        timestamps: timestamps
    });

    console.log(res);

}

export async function getHighscores() {
    const {data, error} = await db.from('hanoi_highscores').select().neq("nickname", null).eq("nb_disk", diskCount).limit(15);
  console.log(error);
  console.log(data);
  return data;
}

function displayHighscores(scores) {
    const highscoreText = scene.add.text(W * 0.22, H * 0.23, messageMap["HIGHSCORES_TITLE"], font.larger);
    let y = H * 0.28;
    scores.map((score, i) => {
        scene.add.text(W * 0.28, y + 40 * i, `${i + 1}. ${score.nickname}`, font.normal);
        scene.add.text(W * 0.59, y + 40 * i, `${score.nb_move}`, font.normal);
        scene.add.text(W * 0.64, y + 40 * i, `${score.elapsed_time.toFixed(2)}s`, font.normal);
    });
}
