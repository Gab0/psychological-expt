// game.js - Reverse Learning Task (RLT)
import {
    font,
    nickname,
    PsyExpBaseConfig,
    fetchMessages,
    updateDatabase,
    getHighscores,
    StandardBriefingScene
} from '../../psyexp_core.js';

const required = [Phaser];

const messageMap = await fetchMessages("en-us", "rlt");

// Global score that persists across scenes
let globalScore = 0;

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
        this.add.text(W * 0.5, H * 0.15, 'Reverse Learning Task', {
            fontSize: '48px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Instructions
        const instructionsText = messageMap["BRIEFING"] || 
            "In this task, you will see two shapes on the screen.\n\n" +
            "Your goal is to learn which shape is 'correct' by trial and error.\n" +
            "Use the LEFT ARROW key or CLICK to select the left shape.\n" +
            "Use the RIGHT ARROW key or CLICK to select the right shape.\n\n" +
            "You will receive feedback, but it may not always be 100% accurate.\n" +
            "IMPORTANT: The rules may change during the task!\n" +
            "Pay attention to the overall pattern and adapt your strategy.\n\n" +
            "You will start with a 10-trial practice session.\n\n" +
            "Press SPACEBAR to begin.";

        this.add.text(W * 0.5, H * 0.5, instructionsText, {
            fontSize: '28px',
            fill: '#ffffff',
            wordWrap: { width: W - 200 },
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Start on spacebar
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.scene.start('PracticeScene');
        });
    }
}

// Base class for shared functionality
class BaseRLTScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.currentTrial = 0;
        this.results = [];
        this.correctStimulus = Math.random() < 0.5 ? 'left' : 'right';
        this.feedbackDuration = 1500;
        this.isWaitingForResponse = false;
        this.trialStartTime = 0;
        this.correctFeedbackRatio = 0.75;
        this.score = 0; // Persistent score
    }

    createBaseUI(W, H, title, titleColor = '#ffffff') {
        this.cameras.main.setBackgroundColor('#34495e');

        // Title
        this.add.text(W * 0.5, H * 0.05, title, {
            fontSize: '32px',
            fill: titleColor,
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Trial counter
        this.trialText = this.add.text(W * 0.1, H * 0.1, '', {
            fontSize: '24px',
            fill: '#ffffff'
        });

        // Score display
        this.scoreText = this.add.text(W * 0.9, H * 0.1, '', {
            fontSize: '24px',
            fill: '#f39c12',
            fontWeight: 'bold'
        }).setOrigin(1, 0);

        // Feedback text
        this.feedbackText = this.add.text(W * 0.5, H * 0.8, '', {
            fontSize: '36px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }

    setupStimuli(W, H) {
        // Create stimulus containers
        this.leftStimulus = this.add.graphics();
        this.rightStimulus = this.add.graphics();

        // Position stimuli
        this.leftPos = { x: W * 0.3, y: H * 0.5 };
        this.rightPos = { x: W * 0.7, y: H * 0.5 };

        const size = 120;
        
        // Left Stimulus - Blue Square
        this.leftStimulus.clear();
        this.leftStimulus.fillStyle(0x3498db);
        this.leftStimulus.fillRect(-size/2, -size/2, size, size);
        this.leftStimulus.setPosition(this.leftPos.x, this.leftPos.y);

        // Right Stimulus - Red Circle
        this.rightStimulus.clear();
        this.rightStimulus.fillStyle(0xe74c3c);
        this.rightStimulus.fillCircle(0, 0, size/2);
        this.rightStimulus.setPosition(this.rightPos.x, this.rightPos.y);

        // Half screen click zones
        this.leftZone = this.add.zone(0, 0, W / 2, H).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        this.rightZone = this.add.zone(W / 2, 0, W / 2, H).setOrigin(0, 0).setInteractive({ useHandCursor: true });

        // Add click handlers
        this.leftZone.on('pointerdown', () => this.handleResponse('left'));
        this.rightZone.on('pointerdown', () => this.handleResponse('right'));

        // Add hover effects
        this.leftZone.on('pointerover', () => this.leftStimulus.setAlpha(0.8));
        this.leftZone.on('pointerout', () => this.leftStimulus.setAlpha(1));
        this.rightZone.on('pointerover', () => this.rightStimulus.setAlpha(0.8));
        this.rightZone.on('pointerout', () => this.rightStimulus.setAlpha(1));

        // Add labels
        this.add.text(this.leftPos.x, this.leftPos.y + size/2 + 30, 'LEFT ARROW / CLICK', {
            fontSize: '16px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.add.text(this.rightPos.x, this.rightPos.y + size/2 + 30, 'RIGHT ARROW / CLICK', {
            fontSize: '16px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }

    setupControls() {
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.leftKey.on('down', () => this.handleResponse('left'));
        this.rightKey.on('down', () => this.handleResponse('right'));
    }

    updateScore(isCorrect) {
        if (typeof isCorrect === 'boolean') {
            globalScore += isCorrect ? 1 : -1;
        } else {
            globalScore = isCorrect; // For initialization
        }
        this.score = globalScore;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    showFeedback(isCorrect) {
        if (isCorrect) {
            this.feedbackText.setText('Correct!');
            this.feedbackText.setFill('#2ecc71');
        } else {
            this.feedbackText.setText('Incorrect');
            this.feedbackText.setFill('#e74c3c');
        }
    }

    highlightSelectedStimulus(selectedStimulus) {
        if (selectedStimulus === 'left') {
            this.leftStimulus.setAlpha(0.7);
            this.rightStimulus.setAlpha(0.3);
        } else {
            this.rightStimulus.setAlpha(0.7);
            this.leftStimulus.setAlpha(0.3);
        }
    }

    resetStimuliAppearance() {
        this.leftStimulus.setAlpha(1);
        this.rightStimulus.setAlpha(1);
    }
}

// Practice Scene
class PracticeScene extends BaseRLTScene {
    constructor() {
        super({ key: 'PracticeScene' });
        this.totalTrials = 10;
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Create base UI with orange title for practice
        this.createBaseUI(W, H, 'PRACTICE SESSION', '#f39c12');
        
        // Setup stimuli and controls
        this.setupStimuli(W, H);
        this.setupControls();

        // Initialize score display (keep current global score)
        this.updateScore(globalScore);

        // Start first trial
        this.startTrial();
    }



    startTrial() {
        if (this.currentTrial >= this.totalTrials) {
            this.endPractice();
            return;
        }

        // Randomly change correct stimulus every few trials
        if (this.currentTrial > 0 && Math.random() < 0.3) {
            this.correctStimulus = this.correctStimulus === 'left' ? 'right' : 'left';
        }

        // Update UI
        this.trialText.setText(`Practice Trial: ${this.currentTrial + 1}/${this.totalTrials}`);
        this.feedbackText.setText('');

        // Reset stimuli appearance
        this.resetStimuliAppearance();
        this.isWaitingForResponse = true;
        this.trialStartTime = this.time.now;
    }

    handleResponse(selectedStimulus) {
        if (!this.isWaitingForResponse) return;

        this.isWaitingForResponse = false;
        const reactionTime = this.time.now - this.trialStartTime;
        const isActuallyCorrect = selectedStimulus === this.correctStimulus;
        
        // Determine feedback based on probabilistic rule (75% accurate)
        const giveTrueFeedback = Math.random() < this.correctFeedbackRatio;
        const feedbackCorrect = giveTrueFeedback ? isActuallyCorrect : !isActuallyCorrect;

        // Record trial data
        const trialData = {
            trial: this.currentTrial + 1,
            phase: 'practice',
            selectedStimulus: selectedStimulus,
            correctStimulus: this.correctStimulus,
            isActuallyCorrect: isActuallyCorrect,
            feedbackGiven: feedbackCorrect,
            feedbackAccurate: giveTrueFeedback,
            reactionTime: reactionTime,
            timestamp: new Date().toISOString()
        };

        this.results.push(trialData);

        // Update score and show feedback
        this.updateScore(feedbackCorrect);
        this.showFeedback(feedbackCorrect);

        // Highlight selected stimulus
        this.highlightSelectedStimulus(selectedStimulus);

        // Continue to next trial after feedback
        this.time.delayedCall(this.feedbackDuration, () => {
            this.currentTrial++;
            this.startTrial();
        });
    }

    showFeedback(isCorrect) {
        if (isCorrect) {
            this.feedbackText.setText('Correct!');
            this.feedbackText.setFill('#2ecc71');
        } else {
            this.feedbackText.setText('Incorrect');
            this.feedbackText.setFill('#e74c3c');
        }
    }

    endPractice() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#2c3e50');
        this.children.each(child => child.destroy());

        // Calculate practice accuracy
        const accuracy = this.results.length > 0 ?
            (this.results.filter(r => r.isActuallyCorrect).length / this.results.length) * 100 : 0;

        const practiceText = 
            `Practice Complete!\n\n` +
            `Accuracy: ${accuracy.toFixed(1)}%\n\n` +
            `Now you will begin the main experiment.\n` +
            `Remember: The rules may change during the task!\n\n` +
            `Press SPACEBAR to continue to the main experiment.`;

        this.add.text(W * 0.5, H * 0.5, practiceText, {
            fontSize: '28px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Continue to main game
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.scene.start('GameScene');
        });
    }
}

// Main Game Scene
class GameScene extends BaseRLTScene {
    constructor() {
        super({ key: 'GameScene' });
        this.phase = 'learning'; // 'learning' or 'reversal'
        this.reversalTrialStart = 40; // Reversal starts at trial 40
        this.totalTrials = 80;
        
        // Performance tracking
        this.learningErrors = 0;
        this.reversalErrors = 0;
        this.learningCriterion = false;
        this.reversalCriterion = false;
        this.consecutiveCorrect = 0;
        this.learningCriterionTrial = null;
        this.reversalCriterionTrial = null;
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Create base UI with white title for main game
        this.createBaseUI(W, H, 'Reverse Learning Task');
        
        // Add phase indicator
        this.phaseText = this.add.text(W * 0.5, H * 0.15, '', {
            fontSize: '20px',
            fill: '#ecf0f1'
        }).setOrigin(0.5);
        
        // Setup stimuli and controls
        this.setupStimuli(W, H);
        this.setupControls();

        // Initialize score display (carry over from practice)
        this.updateScore(globalScore);

        // Start first trial
        this.startTrial();
    }



    startTrial() {
        if (this.currentTrial >= this.totalTrials) {
            this.endGame();
            return;
        }

        // Randomly change correct stimulus occasionally during learning phase
        if (this.phase === 'learning' && this.currentTrial > 0 && Math.random() < 0.2) {
            this.correctStimulus = this.correctStimulus === 'left' ? 'right' : 'left';
        }
        
        // Check if we should start reversal phase
        if (this.currentTrial === this.reversalTrialStart) {
            this.phase = 'reversal';
            this.correctStimulus = this.correctStimulus === 'left' ? 'right' : 'left';
            this.consecutiveCorrect = 0; // Reset for reversal phase
        }
        
        // Randomly change correct stimulus occasionally during reversal phase
        if (this.phase === 'reversal' && this.currentTrial > this.reversalTrialStart && Math.random() < 0.2) {
            this.correctStimulus = this.correctStimulus === 'left' ? 'right' : 'left';
        }

        // Update UI
        this.trialText.setText(`Trial: ${this.currentTrial + 1}/${this.totalTrials}`);
        this.phaseText.setText(`Phase: ${this.phase.charAt(0).toUpperCase() + this.phase.slice(1)}`);
        this.feedbackText.setText('');

        // Reset stimuli appearance
        this.resetStimuliAppearance();
        this.isWaitingForResponse = true;
        this.trialStartTime = this.time.now;
    }

    handleResponse(selectedStimulus) {
        if (!this.isWaitingForResponse) return;

        this.isWaitingForResponse = false;
        const reactionTime = this.time.now - this.trialStartTime;
        const isActuallyCorrect = selectedStimulus === this.correctStimulus;
        
        // Determine feedback based on probabilistic rule (75% accurate)
        const giveTrueFeedback = Math.random() < this.correctFeedbackRatio;
        const feedbackCorrect = giveTrueFeedback ? isActuallyCorrect : !isActuallyCorrect;

        // Record trial data
        const trialData = {
            trial: this.currentTrial + 1,
            phase: this.phase,
            selectedStimulus: selectedStimulus,
            correctStimulus: this.correctStimulus,
            isActuallyCorrect: isActuallyCorrect,
            feedbackGiven: feedbackCorrect,
            feedbackAccurate: giveTrueFeedback,
            reactionTime: reactionTime,
            timestamp: new Date().toISOString()
        };

        this.results.push(trialData);

        // Track performance based on actual correctness
        if (isActuallyCorrect) {
            this.consecutiveCorrect++;
            // Check for learning criterion (8 consecutive correct)
            if (this.consecutiveCorrect >= 8) {
                if (this.phase === 'learning' && !this.learningCriterion) {
                    this.learningCriterion = true;
                    this.learningCriterionTrial = this.currentTrial + 1;
                } else if (this.phase === 'reversal' && !this.reversalCriterion) {
                    this.reversalCriterion = true;
                    this.reversalCriterionTrial = this.currentTrial + 1;
                }
            }
        } else {
            this.consecutiveCorrect = 0;
            // Track errors
            if (this.phase === 'learning') {
                this.learningErrors++;
            } else {
                this.reversalErrors++;
            }
        }

        // Update score and show feedback (based on probabilistic feedback, not actual correctness)
        this.updateScore(feedbackCorrect);
        this.showFeedback(feedbackCorrect);

        // Highlight selected stimulus
        this.highlightSelectedStimulus(selectedStimulus);

        // Continue to next trial after feedback
        this.time.delayedCall(this.feedbackDuration, () => {
            this.currentTrial++;
            this.startTrial();
        });
    }

    showFeedback(isCorrect) {
        if (isCorrect) {
            this.feedbackText.setText('Correct!');
            this.feedbackText.setFill('#2ecc71');
        } else {
            this.feedbackText.setText('Incorrect');
            this.feedbackText.setFill('#e74c3c');
        }
    }

    async endGame() {
        // Calculate performance metrics
        const learningTrials = this.results.filter(r => r.phase === 'learning');
        const reversalTrials = this.results.filter(r => r.phase === 'reversal');
        
        const learningAccuracy = learningTrials.length > 0 ? 
            (learningTrials.filter(r => r.isActuallyCorrect).length / learningTrials.length) * 100 : 0;
        
        const reversalAccuracy = reversalTrials.length > 0 ? 
            (reversalTrials.filter(r => r.isActuallyCorrect).length / reversalTrials.length) * 100 : 0;
            
        // Calculate feedback accuracy (how often feedback matched reality)
        const feedbackAccuracy = this.results.length > 0 ?
            (this.results.filter(r => r.feedbackAccurate).length / this.results.length) * 100 : 0;

        const avgReactionTime = this.results.length > 0 ?
            this.results.reduce((sum, r) => sum + r.reactionTime, 0) / this.results.length : 0;

        // Check learning criteria (8 out of 10 consecutive correct)
        this.learningCriterion = this.checkLearningCriterion(learningTrials);
        this.reversalCriterion = this.checkLearningCriterion(reversalTrials);

        // Prepare data for database
        const experimentData = {
            participant_id: nickname,
            total_trials: this.totalTrials,
            learning_trials: learningTrials.length,
            reversal_trials: reversalTrials.length,
            learning_errors: this.learningErrors,
            reversal_errors: this.reversalErrors,
            learning_accuracy: learningAccuracy,
            reversal_accuracy: reversalAccuracy,
            learning_criterion: this.learningCriterion,
            reversal_criterion: this.reversalCriterion,
            learning_criterion_trial: this.learningCriterionTrial,
            reversal_criterion_trial: this.reversalCriterionTrial,
            feedback_accuracy: feedbackAccuracy,
            avg_reaction_time: avgReactionTime,
            results: JSON.stringify(this.results),
            timestamp: new Date().toISOString()
        };

        // Save to database
        await updateDatabase(experimentData, 'rlt');

        // Show completion screen
        this.showCompletionScreen(experimentData);
    }

    checkLearningCriterion(trials) {
        if (trials.length < 8) return false;
        
        // Check for 8 consecutive correct responses based on actual correctness
        let consecutiveCorrect = 0;
        let maxConsecutive = 0;
        
        for (let i = trials.length - 1; i >= 0; i--) {
            if (trials[i].isActuallyCorrect) {
                consecutiveCorrect++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveCorrect);
            } else {
                break; // Stop at first incorrect response when counting backwards
            }
        }
        
        return maxConsecutive >= 8;
    }

    showCompletionScreen(data) {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#2c3e50');
        this.children.each(child => child.destroy());

        // Title
        this.add.text(W * 0.5, H * 0.1, 'Task Complete!', {
            fontSize: '48px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Results
        const resultsText = 
            `Learning Phase:\n` +
            `  Accuracy: ${data.learning_accuracy.toFixed(1)}%\n` +
            `  Errors: ${data.learning_errors}\n` +
            `  Criterion Met: ${data.learning_criterion ? 'Yes (Trial ' + data.learning_criterion_trial + ')' : 'No'}\n\n` +
            `Reversal Phase:\n` +
            `  Accuracy: ${data.reversal_accuracy.toFixed(1)}%\n` +
            `  Errors: ${data.reversal_errors}\n` +
            `  Criterion Met: ${data.reversal_criterion ? 'Yes (Trial ' + data.reversal_criterion_trial + ')' : 'No'}\n\n` +
            `Feedback Accuracy: ${data.feedback_accuracy.toFixed(1)}%\n` +
            `Average Reaction Time: ${data.avg_reaction_time.toFixed(0)}ms\n\n` +
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
        const scores = await getHighscores(
            'rlt',
            'learning_accuracy',
            false,
            (query) => query.gte('learning_accuracy', 0)
        );

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
        this.add.text(W * 0.6, H * 0.2, 'Learning %', { fontSize: '24px', fill: '#ffffff' });
        this.add.text(W * 0.8, H * 0.2, 'Reversal %', { fontSize: '24px', fill: '#ffffff' });

        // Scores
        let y = H * 0.28;
        scores.slice(0, 10).forEach((score, index) => {
            const rank = index + 1;
            const name = score.participant_id || 'Anonymous';
            const learningAcc = score.learning_accuracy ? score.learning_accuracy.toFixed(1) : '0.0';
            const reversalAcc = score.reversal_accuracy ? score.reversal_accuracy.toFixed(1) : '0.0';

            this.add.text(W * 0.2, y, `${rank}.`, { fontSize: '20px', fill: '#ffffff' });
            this.add.text(W * 0.4, y, name, { fontSize: '20px', fill: '#ffffff' });
            this.add.text(W * 0.6, y, `${learningAcc}%`, { fontSize: '20px', fill: '#ffffff' });
            this.add.text(W * 0.8, y, `${reversalAcc}%`, { fontSize: '20px', fill: '#ffffff' });

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
            this.scene.start('InstructionsScene');
        });
    }
}

// Initialize game
const config = PsyExpBaseConfig([InstructionsScene, PracticeScene, GameScene]);
const game = new Phaser.Game(config);
