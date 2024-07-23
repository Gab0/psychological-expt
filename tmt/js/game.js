document.title = "Trail Making Test (TMT)";

class TMTScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TMTScene' });
        this.circleData = [
            { x: 100, y: 150, num: 1 },
            { x: 300, y: 200, num: 2 },
            { x: 500, y: 100, num: 3 },
            { x: 200, y: 400, num: 4 },
            { x: 400, y: 300, num: 5 }
        ];
        this.currentCircle = 1;
    }

    preload() {
        this.load.image('circle', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'); // Simple placeholder image
    }

    create() {
        this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x00ff00 } });
        this.circleGroup = this.physics.add.group();

        this.circleData.forEach(data => {
            let circle = this.circleGroup.create(data.x, data.y, 'circle').setInteractive();
            circle.num = data.num;
            circle.setScale(0.1); // Adjust size
            circle.on('pointerdown', this.checkCircle, this);
        });
    }

    checkCircle(circle) {
        if (circle.num === this.currentCircle) {
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
