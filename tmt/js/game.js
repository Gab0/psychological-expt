document.title = "Trail Making Test (TMT)";


class TMTScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TMTScene' });
        this.circleData = [...Array(25).keys()].map(
            (value) => {
                return {
                    x: Phaser.Math.Between(50, 750),
                    y: Phaser.Math.Between(50, 550),
                    num: value + 1
                }
            });

        this.currentCircle = 1;

        this.isDrawing = false;
    }

    preload() {
        this.load.image('circle', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'); // Simple placeholder image
    }

    create() {
        this.circleGroup = this.physics.add.group();

        this.circleData.forEach(data => {
            this.createCircle(data.x, data.y, data.num);
        });

    }

    createCircle(x, y, number) {
        let graphics = this.add.graphics({ fillStyle: { color: 0xffffff } });
        const circleRadius = 30;
        const circle = graphics.fillCircle(x, y, circleRadius);
        //circle.setOrigin(0.5, 0.5);

        const text = this.add.text(x, y, number, { fontSize: '32px', fill: '#000' });
        text.setOrigin(0.5, 0.5);
        circle.setInteractive();
        circle.on('pointerdown', this.checkCircle, this);
        circle.num = number;
    }

    checkCircle(circle) {
        if (circle.num === this.currentCircle) {
            console.log("OK");
            circle.setTint(0x00ff00);
            this.currentCircle++;
            this.drawLine(circle);
            if (this.currentCircle > this.circleData.length) {
                this.endGame();
            }
        } else {
            circle.setTint(0xff0000);
        }
    }

    drawLine(circle) {
        if (this.lines && this.lines.length > 0) {
            let lastCircle = this.lines[this.lines.length - 1];
            this.graphics.lineBetween(lastCircle.x, lastCircle.y, circle.x, circle.y);
        }
        this.lines = this.lines || [];
        this.lines.push(circle);
    }

    endGame() {
        this.add.text(250, 450, 'Test Completed!', { fontSize: '32px', fill: '#ffffff' });
        this.circleGroup.getChildren().forEach(circle => {
            circle.disableInteractive();
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: TMTScene,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
