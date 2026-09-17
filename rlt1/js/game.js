// game.js - Reverse Learning Task (RLT) - New Implementation
import {
    font,
    nickname,
    PsyExpBaseConfig,
    fetchMessages,
    updateDatabase,
    getHighscores,
    displayHighscores
} from '../../psyexp_core.js';

// Global variables
let globalScore = 0;
let messageMap = {};

// Initialize messages
try {
    messageMap = await fetchMessages("en-us", "rlt");
} catch (error) {
    console.log("Could not fetch messages, using defaults");
    messageMap = {};
}

// Instructions Scene
class InstructionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionsScene' });
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#2c3e50');

        // Title
        this.add.text(W * 0.5, H * 0.1, 'Reverse Learning Task', {
            fontSize: '48px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Instructions
        const instructionsText = messageMap["BRIEFING"] || 
            "Welcome to the Reverse Learning Task!\n\n" +
            "You will see two shapes on the screen.\n" +
            "One shape is 'correct' and will increase your score by +1.\n" +
            "The other shape is 'wrong' and will decrease your score by -1.\n\n" +
            "Your goal is to learn which shape is correct through trial and error.\n" +
            "The shapes will appear on random sides each round.\n\n" +
            "Controls:\n" +
            "• Click on a shape to select it\n" +
            "• Use LEFT ARROW to select the left shape\n" +
            "• Use RIGHT ARROW to select the right shape\n\n" +
            "You will start with 10 practice rounds, then 80 game rounds.\n" +
            "Your score starts at 0.\n\n" +
            "Press SPACEBAR to begin practice.";

        this.add.text(W * 0.5, H * 0.5, instructionsText, {
            fontSize: '24px',
            fill: '#ffffff',
            wordWrap: { width: W - 200 },
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        // Start on spacebar
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.scene.start('PracticeScene');
        });
    }
}

// Practice Scene
class PracticeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PracticeScene' });
        this.currentTrial = 0;
        this.totalTrials = 10;
        this.score = 0;
        this.results = [];
        this.isWaitingForResponse = false;
        this.trialStartTime = 0;
        
        // Define shapes and their initial correctness
        this.shapes = [
            { name: 'circle', color: 0xff6b6b, correct: true },
            { name: 'square', color: 0x4ecdc4, correct: false }
        ];
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#34495e');

        // UI Elements
        this.add.text(W * 0.5, H * 0.05, 'Practice Session', {
            fontSize: '36px',
            fill: '#f39c12',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.trialText = this.add.text(W * 0.1, H * 0.1, '', {
            fontSize: '24px',
            fill: '#ffffff'
        });

        this.scoreText = this.add.text(W * 0.9, H * 0.1, '', {
            fontSize: '24px',
            fill: '#f39c12',
            fontWeight: 'bold'
        }).setOrigin(1, 0);

        this.feedbackText = this.add.text(W * 0.5, H * 0.8, '', {
            fontSize: '32px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Create shape containers
        this.leftShape = this.add.graphics();
        this.rightShape = this.add.graphics();

        // Setup controls
        this.setupControls();

        // Start first trial
        this.startTrial();
    }

    setupControls() {
        // Keyboard controls
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

        this.leftKey.on('down', () => {
            if (this.isWaitingForResponse) {
                this.handleResponse('left');
            }
        });

        this.rightKey.on('down', () => {
            if (this.isWaitingForResponse) {
                this.handleResponse('right');
            }
        });

        // Mouse controls will be set up per trial
    }

    startTrial() {
        this.currentTrial++;
        this.isWaitingForResponse = true;
        this.trialStartTime = this.time.now;

        // Update UI
        this.trialText.setText(`Practice Trial: ${this.currentTrial}/${this.totalTrials}`);
        this.scoreText.setText(`Score: ${this.score}`);
        this.feedbackText.setText('');

        // Randomize shape positions
        const leftShapeIndex = Math.random() < 0.5 ? 0 : 1;
        const rightShapeIndex = leftShapeIndex === 0 ? 1 : 0;

        this.leftShapeData = this.shapes[leftShapeIndex];
        this.rightShapeData = this.shapes[rightShapeIndex];

        // Draw shapes
        this.drawShapes();
    }

    drawShapes() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;
        const shapeSize = 100;

        // Clear previous shapes
        this.leftShape.clear();
        this.rightShape.clear();

        // Position shapes
        const leftPos = { x: W * 0.3, y: H * 0.5 };
        const rightPos = { x: W * 0.7, y: H * 0.5 };

        // Draw left shape
        this.leftShape.fillStyle(this.leftShapeData.color);
        if (this.leftShapeData.name === 'circle') {
            this.leftShape.fillCircle(0, 0, shapeSize / 2);
        } else {
            this.leftShape.fillRect(-shapeSize / 2, -shapeSize / 2, shapeSize, shapeSize);
        }
        this.leftShape.setPosition(leftPos.x, leftPos.y);

        // Draw right shape
        this.rightShape.fillStyle(this.rightShapeData.color);
        if (this.rightShapeData.name === 'circle') {
            this.rightShape.fillCircle(0, 0, shapeSize / 2);
        } else {
            this.rightShape.fillRect(-shapeSize / 2, -shapeSize / 2, shapeSize, shapeSize);
        }
        this.rightShape.setPosition(rightPos.x, rightPos.y);

        // Make shapes interactive via half-screen zones
        if (!this.leftZone) {
            this.leftZone = this.add.zone(0, 0, W / 2, H).setOrigin(0, 0).setInteractive({ useHandCursor: true });
            this.leftZone.on('pointerdown', () => {
                if (this.isWaitingForResponse) this.handleResponse('left');
            });
            this.rightZone = this.add.zone(W / 2, 0, W / 2, H).setOrigin(0, 0).setInteractive({ useHandCursor: true });
            this.rightZone.on('pointerdown', () => {
                if (this.isWaitingForResponse) this.handleResponse('right');
            });
        }
    }

    handleResponse(selectedSide) {
        if (!this.isWaitingForResponse) return;

        this.isWaitingForResponse = false;
        const reactionTime = this.time.now - this.trialStartTime;

        // Determine if response is correct
        const selectedShape = selectedSide === 'left' ? this.leftShapeData : this.rightShapeData;
        const isCorrect = selectedShape.correct;

        // Update score
        if (isCorrect) {
            this.score += 1;
        } else {
            this.score -= 1;
        }

        // Record trial data
        this.results.push({
            trial: this.currentTrial,
            selectedSide: selectedSide,
            selectedShape: selectedShape.name,
            correct: isCorrect,
            score: this.score,
            reactionTime: reactionTime,
            leftShape: this.leftShapeData.name,
            rightShape: this.rightShapeData.name
        });

        // Show feedback
        this.showFeedback(isCorrect);
    }

    showFeedback(isCorrect) {
        const feedbackText = isCorrect ? 'Correct! +1' : 'Wrong! -1';
        const feedbackColor = isCorrect ? '#2ecc71' : '#e74c3c';

        this.feedbackText.setText(feedbackText);
        this.feedbackText.setColor(feedbackColor);
        this.scoreText.setText(`Score: ${this.score}`);

        // Wait 1.5 seconds then continue
        this.time.delayedCall(1500, () => {
            if (this.currentTrial >= this.totalTrials) {
                this.endPractice();
            } else {
                this.startTrial();
            }
        });
    }

    endPractice() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Clear screen
        this.children.each(child => child.destroy());

        this.cameras.main.setBackgroundColor('#2c3e50');

        // Practice complete message
        this.add.text(W * 0.5, H * 0.3, 'Practice Complete!', {
            fontSize: '48px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.5, `Practice Score: ${this.score}`, {
            fontSize: '32px',
            fill: '#f39c12'
        }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.7, 'Press SPACEBAR to start the main game', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Set global score for main game
        globalScore = this.score;

        // Start main game on spacebar
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.scene.start('GameScene');
        });
    }
}

// Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.currentTrial = 0;
        this.totalTrials = 80;
        this.score = 0;
        this.results = [];
        this.isWaitingForResponse = false;
        this.trialStartTime = 0;
        
        // Define shapes and their initial correctness
        this.shapes = [
            { name: 'circle', color: 0xff6b6b, correct: true },
            { name: 'square', color: 0x4ecdc4, correct: false }
        ];
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Set score from practice
        this.score = globalScore;

        this.cameras.main.setBackgroundColor('#34495e');

        // UI Elements
        this.add.text(W * 0.5, H * 0.05, 'Main Game', {
            fontSize: '36px',
            fill: '#e74c3c',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.trialText = this.add.text(W * 0.1, H * 0.1, '', {
            fontSize: '24px',
            fill: '#ffffff'
        });

        this.scoreText = this.add.text(W * 0.9, H * 0.1, '', {
            fontSize: '24px',
            fill: '#f39c12',
            fontWeight: 'bold'
        }).setOrigin(1, 0);

        this.feedbackText = this.add.text(W * 0.5, H * 0.8, '', {
            fontSize: '32px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Create shape containers
        this.leftShape = this.add.graphics();
        this.rightShape = this.add.graphics();

        // Setup controls
        this.setupControls();

        // Start first trial
        this.startTrial();
    }

    setupControls() {
        // Keyboard controls
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

        this.leftKey.on('down', () => {
            if (this.isWaitingForResponse) {
                this.handleResponse('left');
            }
        });

        this.rightKey.on('down', () => {
            if (this.isWaitingForResponse) {
                this.handleResponse('right');
            }
        });

        // Mouse controls will be set up per trial
    }

    startTrial() {
        this.currentTrial++;
        this.isWaitingForResponse = true;
        this.trialStartTime = this.time.now;

        // Check if we need to reverse the rules (at trial 41, halfway through)
        if (this.currentTrial === 41) {
            // Reverse which shape is correct
            this.shapes[0].correct = !this.shapes[0].correct;
            this.shapes[1].correct = !this.shapes[1].correct;
        }

        // Update UI
        this.trialText.setText(`Trial: ${this.currentTrial}/${this.totalTrials}`);
        this.scoreText.setText(`Score: ${this.score}`);
        this.feedbackText.setText('');

        // Randomize shape positions
        const leftShapeIndex = Math.random() < 0.5 ? 0 : 1;
        const rightShapeIndex = leftShapeIndex === 0 ? 1 : 0;

        this.leftShapeData = this.shapes[leftShapeIndex];
        this.rightShapeData = this.shapes[rightShapeIndex];

        // Draw shapes
        this.drawShapes();
    }

    drawShapes() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;
        const shapeSize = 100;

        // Clear previous shapes
        this.leftShape.clear();
        this.rightShape.clear();

        // Position shapes
        const leftPos = { x: W * 0.3, y: H * 0.5 };
        const rightPos = { x: W * 0.7, y: H * 0.5 };

        // Draw left shape
        this.leftShape.fillStyle(this.leftShapeData.color);
        if (this.leftShapeData.name === 'circle') {
            this.leftShape.fillCircle(0, 0, shapeSize / 2);
        } else {
            this.leftShape.fillRect(-shapeSize / 2, -shapeSize / 2, shapeSize, shapeSize);
        }
        this.leftShape.setPosition(leftPos.x, leftPos.y);

        // Draw right shape
        this.rightShape.fillStyle(this.rightShapeData.color);
        if (this.rightShapeData.name === 'circle') {
            this.rightShape.fillCircle(0, 0, shapeSize / 2);
        } else {
            this.rightShape.fillRect(-shapeSize / 2, -shapeSize / 2, shapeSize, shapeSize);
        }
        this.rightShape.setPosition(rightPos.x, rightPos.y);

        // Make shapes interactive via half-screen zones
        if (!this.leftZone) {
            this.leftZone = this.add.zone(0, 0, W / 2, H).setOrigin(0, 0).setInteractive({ useHandCursor: true });
            this.leftZone.on('pointerdown', () => {
                if (this.isWaitingForResponse) this.handleResponse('left');
            });
            this.rightZone = this.add.zone(W / 2, 0, W / 2, H).setOrigin(0, 0).setInteractive({ useHandCursor: true });
            this.rightZone.on('pointerdown', () => {
                if (this.isWaitingForResponse) this.handleResponse('right');
            });
        }
    }

    handleResponse(selectedSide) {
        if (!this.isWaitingForResponse) return;

        this.isWaitingForResponse = false;
        const reactionTime = this.time.now - this.trialStartTime;

        // Determine if response is correct
        const selectedShape = selectedSide === 'left' ? this.leftShapeData : this.rightShapeData;
        const isCorrect = selectedShape.correct;

        // Update score
        if (isCorrect) {
            this.score += 1;
        } else {
            this.score -= 1;
        }

        // Record trial data
        this.results.push({
            trial: this.currentTrial,
            selectedSide: selectedSide,
            selectedShape: selectedShape.name,
            correct: isCorrect,
            score: this.score,
            reactionTime: reactionTime,
            leftShape: this.leftShapeData.name,
            rightShape: this.rightShapeData.name,
            phase: this.currentTrial <= 40 ? 'learning' : 'reversal'
        });

        // Show feedback
        this.showFeedback(isCorrect);
    }

    showFeedback(isCorrect) {
        const feedbackText = isCorrect ? 'Correct! +1' : 'Wrong! -1';
        const feedbackColor = isCorrect ? '#2ecc71' : '#e74c3c';

        this.feedbackText.setText(feedbackText);
        this.feedbackText.setColor(feedbackColor);
        this.scoreText.setText(`Score: ${this.score}`);

        // Wait 1.5 seconds then continue
        this.time.delayedCall(1500, () => {
            if (this.currentTrial >= this.totalTrials) {
                this.endGame();
            } else {
                this.startTrial();
            }
        });
    }

    async endGame() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Calculate performance metrics
        const learningTrials = this.results.filter(r => r.phase === 'learning');
        const reversalTrials = this.results.filter(r => r.phase === 'reversal');
        
        const learningAccuracy = learningTrials.length > 0 ? 
            (learningTrials.filter(r => r.correct).length / learningTrials.length) * 100 : 0;
        const reversalAccuracy = reversalTrials.length > 0 ? 
            (reversalTrials.filter(r => r.correct).length / reversalTrials.length) * 100 : 0;
        
        const avgReactionTime = this.results.reduce((sum, r) => sum + r.reactionTime, 0) / this.results.length;

        // Prepare data for database
        const experimentData = {
            final_score: this.score,
            total_trials: this.totalTrials,
            learning_accuracy: learningAccuracy,
            reversal_accuracy: reversalAccuracy,
            avg_reaction_time: avgReactionTime,
            trial_data: this.results
        };

        // Save to database
        try {
            await updateDatabase(experimentData, 'rlt');
        } catch (error) {
            console.log("Could not save to database:", error);
        }

        // Clear screen
        this.children.each(child => child.destroy());
        this.cameras.main.setBackgroundColor('#2c3e50');

        // Show completion screen
        this.add.text(W * 0.5, H * 0.1, 'Game Complete!', {
            fontSize: '48px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        const resultsText = 
            `Final Score: ${this.score}\n\n` +
            `Learning Phase Accuracy: ${learningAccuracy.toFixed(1)}%\n` +
            `Reversal Phase Accuracy: ${reversalAccuracy.toFixed(1)}%\n` +
            `Average Reaction Time: ${avgReactionTime.toFixed(0)}ms\n\n` +
            `Press SPACEBAR to see high scores`;

        this.add.text(W * 0.5, H * 0.5, resultsText, {
            fontSize: '24px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Show high scores on spacebar
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.showHighScores();
        });
    }

    async showHighScores() {
        try {
            const scores = await getHighscores('rlt', 'final_score', false);
            
            const W = this.sys.game.config.width;
            const H = this.sys.game.config.height;

            this.cameras.main.setBackgroundColor('#2c3e50');
            this.children.each(child => child.destroy());

            // Title
            this.add.text(W * 0.5, H * 0.1, 'High Scores', {
                fontSize: '36px',
                fill: '#ffffff',
                fontWeight: 'bold'
            }).setOrigin(0.5);

            // Headers
            this.add.text(W * 0.2, H * 0.2, 'Rank', { fontSize: '24px', fill: '#ffffff' });
            this.add.text(W * 0.4, H * 0.2, 'Name', { fontSize: '24px', fill: '#ffffff' });
            this.add.text(W * 0.6, H * 0.2, 'Score', { fontSize: '24px', fill: '#ffffff' });
            this.add.text(W * 0.8, H * 0.2, 'Learning %', { fontSize: '24px', fill: '#ffffff' });

            // Scores
            let y = H * 0.28;
            scores.slice(0, 10).forEach((score, index) => {
                const rank = index + 1;
                const name = score.nickname || 'Anonymous';
                const finalScore = score.final_score || 0;
                const learningAcc = score.learning_accuracy ? score.learning_accuracy.toFixed(1) : '0.0';

                this.add.text(W * 0.2, y, `${rank}.`, { fontSize: '20px', fill: '#ffffff' });
                this.add.text(W * 0.4, y, name, { fontSize: '20px', fill: '#ffffff' });
                this.add.text(W * 0.6, y, `${finalScore}`, { fontSize: '20px', fill: '#ffffff' });
                this.add.text(W * 0.8, y, `${learningAcc}%`, { fontSize: '20px', fill: '#ffffff' });

                y += H * 0.04;
            });

            // Instructions to restart
            this.add.text(W * 0.5, H * 0.9, 'Press R to restart or close the browser tab', {
                fontSize: '18px',
                fill: '#ffffff'
            }).setOrigin(0.5);

            // Restart on R key
            this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
            this.rKey.on('down', () => {
                globalScore = 0; // Reset global score
                this.scene.start('InstructionsScene');
            });
        } catch (error) {
            console.log("Could not load high scores:", error);
            
            // Show error message
            const W = this.sys.game.config.width;
            const H = this.sys.game.config.height;

            this.add.text(W * 0.5, H * 0.5, 'Could not load high scores.\nPress R to restart.', {
                fontSize: '24px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
            this.rKey.on('down', () => {
                globalScore = 0;
                this.scene.start('InstructionsScene');
            });
        }
    }
}

// Initialize game
const config = PsyExpBaseConfig([InstructionsScene, PracticeScene, GameScene]);
const game = new Phaser.Game(config);
