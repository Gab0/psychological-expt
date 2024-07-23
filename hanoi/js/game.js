
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

let poles = [];
let disks = [];
let moveCount = 0;
let moveText;
let timer;
let timerText;
let startTime;
let diskCount = 7;  // Default number of disks

function preload() {
    this.load.image('disk1', 'disk1.png');
    this.load.image('disk2', 'disk2.png');
    this.load.image('disk3', 'disk3.png');
}

function create() {
    poles = [
        this.add.rectangle(200, 300, 20, 400, 0x6666ff),
        this.add.rectangle(400, 300, 20, 400, 0x6666ff),
        this.add.rectangle(600, 300, 20, 400, 0x6666ff)
    ];

    const diskColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
    for (let i = 0; i < diskCount; i++) {
        const disk = this.add.rectangle(200, 500 - i * 30, 150 - i * 30, 30, diskColors[i % diskColors.length]);
        disk.setInteractive();
        this.input.setDraggable(disk);
        disks.push(disk);
    }

    this.input.on('dragstart', function (pointer, gameObject) {
        gameObject.setData('startX', gameObject.x);
        gameObject.setData('startY', gameObject.y);
    });

    this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
        gameObject.x = dragX;
        gameObject.y = dragY;
    });

    this.input.on('dragend', function (pointer, gameObject) {
        let placed = false;
        for (const pole of poles) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(gameObject.getBounds(), pole.getBounds())) {
                const poleIndex = poles.indexOf(pole);
                const topDisk = getTopDisk(poleIndex);
                if (!topDisk || gameObject.width < topDisk.width) {
                    gameObject.x = pole.x;
                    gameObject.y = 500 - getDisksOnPole(poleIndex) * 30;
                    placed = true;
                    break;
                }
            }
        }
        if (!placed) {
            gameObject.x = gameObject.getData('startX');
            gameObject.y = gameObject.getData('startY');
        } else {
            moveCount++;
            moveText.setText('Moves: ' + moveCount);
            checkWinCondition();
        }
    });

    moveText = this.add.text(16, 16, 'Moves: 0', { fontSize: '32px', fill: '#fff' });
    timerText = this.add.text(16, 50, 'Time: 0', { fontSize: '32px', fill: '#fff' });
    startTime = new Date();
    timer = this.time.addEvent({ delay: 1000, callback: updateTimer, callbackScope: this, loop: true });
}

function update() {}

function getTopDisk(poleIndex) {
    return disks.filter(disk => disk.x === poles[poleIndex].x).sort((a, b) => a.y - b.y)[0];
}

function getDisksOnPole(poleIndex) {
    return disks.filter(disk => disk.x === poles[poleIndex].x).length;
}

function checkWinCondition() {
    const thirdPoleDisks = disks.filter(disk => disk.x === poles[2].x).sort((a, b) => a.y - b.y);
    if (thirdPoleDisks.length === diskCount && thirdPoleDisks.every((disk, index) => disk.width === (150 - index * 30))) {

        return true;
    }
}

function triggerWin() {

        this.add.text(400, 300, 'You Win!', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        timer.paused = true;
        this.input.enabled = false;
}

function updateTimer() {
    const elapsed = Math.floor((new Date() - startTime) / 1000);
    timerText.setText('Time: ' + elapsed);

    checkWinCondition();
}
