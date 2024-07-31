document.title = 'Trail Making Test (TMT)';

class TMTScene extends Phaser.Scene {
	constructor() {
		super({ key: 'TMTScene' });
		this.circleData = [];
		this.circleRadius = 30;
		this.currentCircle = 1;
		this.lines = [];
		this.isDrawing = false;
		this.isGameEnded = false;
		this.isPaused = true; // Pausa o jogo inicialmente para mostrar a tela de introdução
		this.minDistance = this.circleRadius * 3; // Distância mínima entre os círculos
		this.lastCircle = null; // Último círculo correto clicado
		this.wrongCircle = null; // Último círculo errado clicado
		this.startTime = 0; // Tempo de início do jogo
	}

	preload() {
		this.load.image('circle', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'); // Simple placeholder image
	}

	create() {
		this.graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff } });

		// Cronômetro fixo no canto superior direito
		this.timeText = this.add.text(700, 16, 'Time: 0.00', { fontSize: '32px', fill: '#ffffff' });
		this.timeText.setOrigin(1, 0); // Alinha o texto ao canto direito

		// Adicionando fundo desfocado
		this.blurBackground = this.add.graphics();
		this.blurBackground.fillStyle(0x000000); // Meio transparente
		this.blurBackground.fillRect(0, 0, 800, 600);
		this.blurBackground.setDepth(1); // Coloca o desfoque atrás do texto da mensagem inicial

		// Adicionando a tela de introdução
		this.introText = this.add.text(
			400,
			200,
			'You will be shown numbers contained in circles.\n Please click the circles of the numbers in ascending order,\n starting from the lowest number and moving to the next one in order.\n Start at 1, then 2, then 3, and so on.\n Work as quickly and accurately as you can.',
			{
				fontSize: '18px',

				align: 'center',
				fill: '#ffffff',
				align: 'left',
				backgroundColor: '#000000',
			},
		);
		this.introText.setOrigin(0.5, 0.5);
		this.introText.setDepth(2); // Coloca a mensagem na frente

		this.startButton = this.add
			.text(400, 400, 'Start', {
				fontSize: '32px',
				fill: '#ffffff',
				backgroundColor: '#0000ff',
				padding: { left: 20, right: 20, top: 10, bottom: 10 },
			})
			.setInteractive();
		this.startButton.setOrigin(0.5, 0.5);
		this.startButton.setDepth(2); // Coloca o botão na frente

		this.startButton.on(
			'pointerdown',
			() => {
				this.introText.destroy();
				this.startButton.destroy();
				this.blurBackground.destroy(); // Remove o fundo desfocado
				this.isPaused = false; // Retoma o jogo
				this.startTime = this.time.now; // Armazena o tempo de início do jogo
			},
			this,
		);

		for (let i = 0; i < 25; i++) {
			this.createUniqueCircle(i + 1);
		}

		this.input.on('pointerdown', this.startDrawing, this);
		this.input.on('pointerup', this.stopDrawing, this);
		this.input.on('pointermove', this.updateDrawing, this);
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
			x = Phaser.Math.Between(50, 750);
			y = Phaser.Math.Between(50, 550);
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

		// Store the circle and text together
		circle.text = text;
		this.circleData.push({ circle, text, x, y, num: number });
	}

	onCircleClick(circle) {
		if (this.isPaused || this.isGameEnded) return; // Prevent interaction if game is paused or ended

		if (circle.num === this.currentCircle) {
			if (this.lastCircle) {
				// Adiciona a linha à lista de linhas e desenha ela
				let line = new Phaser.Geom.Line(this.lastCircle.x, this.lastCircle.y, circle.x, circle.y);
				this.lines.push(line);
				this.graphics.strokeLineShape(line);
			}
			circle.setFillStyle(0x00ff00); // Cor verde para o círculo correto
			circle.disableInteractive(); // Desabilita interação após clique correto
			this.lastCircle = circle;
			this.currentCircle++;

			// Limpa o círculo errado se houver algum marcado
			if (this.wrongCircle) {
				this.wrongCircle.setFillStyle(0xffffff); // Reset cor para o padrão
				this.wrongCircle = null;
			}
		} else {
			if (this.wrongCircle) {
				this.wrongCircle.setFillStyle(0xffffff); // Reset previous wrong circle color
			}

			circle.setFillStyle(0xff0000); // Cor vermelha para círculo incorreto
			this.wrongCircle = circle;
		}

		if (this.currentCircle > this.circleData.length) {
			this.endGame(true);
		}
	}

	updateDrawing(pointer) {
		if (this.isPaused || this.isGameEnded || !this.isDrawing || !this.lastCircle) return;

		// Primeiro, desenha todas as linhas armazenadas na lista de linhas
		this.graphics.clear();
		this.graphics.lineStyle(4, 0xffffff, 1.0);
		for (let line of this.lines) {
			this.graphics.strokeLineShape(line);
		}

		// Em seguida, desenha a linha temporária do último círculo correto para o ponteiro
		this.graphics.lineBetween(this.lastCircle.x, this.lastCircle.y, pointer.x, pointer.y);
	}

	updateDrawing(pointer) {
		if (this.isPaused || this.isGameEnded || !this.isDrawing || !this.lastCircle) return;

		// Primeiro, desenha todas as linhas armazenadas na lista de linhas
		this.graphics.clear();
		this.graphics.lineStyle(4, 0xffffff, 1.0);
		for (let line of this.lines) {
			this.graphics.strokeLineShape(line);
		}

		// Em seguida, desenha a linha temporária do último círculo correto para o ponteiro
		this.graphics.lineBetween(this.lastCircle.x, this.lastCircle.y, pointer.x, pointer.y);
	}

	startDrawing(pointer) {
		if (this.isPaused || this.isGameEnded) return; // Prevent further drawing if game is paused or ended

		this.isDrawing = true;
		this.lastPointer = { x: pointer.x, y: pointer.y };
	}

	stopDrawing(pointer) {
		if (this.isPaused || this.isGameEnded) return; // Prevent further drawing if game is paused or ended

		if (this.isDrawing) {
			this.isDrawing = false;
			this.updateDrawing(pointer);
		}
	}

	updateDrawing(pointer) {
		if (this.isPaused || this.isGameEnded || !this.isDrawing || !this.lastCircle) return;

		this.graphics.clear();
		this.graphics.lineStyle(4, 0xffffff, 1.0);
		this.graphics.lineBetween(this.lastCircle.x, this.lastCircle.y, pointer.x, pointer.y);
	}

	endGame(success) {
		this.isGameEnded = true; // Flag to indicate game has ended
		this.graphics.clear(); // Clear drawing graphics
		this.input.off('pointerdown', this.startDrawing, this); // Remove pointer event listeners
		this.input.off('pointerup', this.stopDrawing, this);
		this.input.off('pointermove', this.updateDrawing, this);

		if (success) {
			this.add.text(250, 450, 'Test Completed!', { fontSize: '32px', fill: '#ffffff' });
		} else {
			this.add.text(250, 450, 'Test Failed!', { fontSize: '32px', fill: '#ff0000' });
		}

		// Disable interactivity for all circles
		this.circleData.forEach(({ circle }) => {
			circle.disableInteractive();
		});
	}
}

const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 800,
	scene: TMTScene,
	physics: {
		default: 'arcade',
		arcade: {
			debug: false,
		},
	},
};

const game = new Phaser.Game(config);
