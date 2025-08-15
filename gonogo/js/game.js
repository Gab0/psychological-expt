// game.js
import {
    font,
    nickname,
    PsyExpBaseConfig,
    fetchMessages,
    updateDatabase,
    getHighscores,
} from '../../psyexp_core.js';

const required = [Phaser];

const messageMap = await fetchMessages("en-us", "gonogo");
const root = window.location.href.replace(/\/$/, "");

// Instructions Scene
class InstructionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionsScene' });
    }

    preload() {
        this.load.image('background', root + '/assets/fields.jpg');
    }

    create() {
        // Add background
        this.add.image(0, 0, 'background').setOrigin(0, 0).setScale(0.5);

        // Add semi-transparent overlay
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.7);
        graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Add instructions
        const instructionsText = messageMap["BRIEFING"] || 
            "In this task, you will see different shapes appear on the screen. " +
            "Press the SPACEBAR when you see a BLUE SQUARE (Go trial) " +
            "but do NOT press anything when you see a RED CIRCLE (No-Go trial).\n\n" +
            "Press SPACEBAR to begin.";

        const text = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            instructionsText,
            {
                fontSize: '32px',
                fill: '#ffffff',
                wordWrap: { width: this.cameras.main.width - 100 },
                align: 'center'
            }
        ).setOrigin(0.5);

        // Start game on spacebar press
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.scene.start('GameScene');
        });
    }
}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.trials = [];
        this.currentTrial = 0;
        this.results = [];
        this.startTime = 0;
        this.isResponding = false;
        this.feedbackText = null;
    }

    preload() {
        // Load assets
        this.load.image('fixation', 'assets/fixation.png');
        this.load.image('blue_square', 'assets/blue_square.png');
        this.load.image('red_circle', 'assets/red_circle.png');
    }

    create() {
        // Set up game area
        this.cameras.main.setBackgroundColor('#000000');
        
        // Initialize trial data
        this.initializeTrials();
        
        // Set up keyboard input
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', this.handleResponse, this);
        
        // Start the first trial
        this.startTrial();
    }

    initializeTrials() {
        // Create 80% Go trials (blue squares) and 20% No-Go trials (red circles)
        const totalTrials = 100;
        const goTrials = Math.floor(totalTrials * 0.8);
        const noGoTrials = totalTrials - goTrials;
        
        // Create trial array
        for (let i = 0; i < goTrials; i++) {
            this.trials.push({ type: 'go', stimulus: 'blue_square' });
        }
        for (let i = 0; i < noGoTrials; i++) {
            this.trials.push({ type: 'nogo', stimulus: 'red_circle' });
        }
        
        // Shuffle trials
        this.trials = Phaser.Utils.Array.Shuffle(this.trials);
    }

    startTrial() {
        if (this.currentTrial >= this.trials.length) {
            this.endGame();
            return;
        }

        const trial = this.trials[this.currentTrial];
        this.isResponding = false;
        
        // Clear any existing graphics
        this.children.each(child => {
            if (child.type === 'Image') {
                child.destroy();
            }
        });
        
        // Show fixation cross
        this.add.image(400, 300, 'fixation').setScale(0.5);
        
        // After a delay, show the stimulus
        this.time.delayedCall(1000, () => {
            this.children.each(child => child.destroy());
            this.startTime = this.time.now;
            this.add.image(400, 300, trial.stimulus).setScale(0.5);
            this.isResponding = true;
            
            // Set timeout for response window (1.5 seconds)
            this.responseTimeout = this.time.delayedCall(1500, () => {
                if (this.isResponding) {
                    this.recordResponse(trial, null, 'timeout');
                    this.nextTrial();
                }
            });
        });
    }

    handleResponse() {
        if (!this.isResponding) return;
        
        // Clear the response timeout
        if (this.responseTimeout) {
            this.responseTimeout.destroy();
        }
        
        const trial = this.trials[this.currentTrial];
        const reactionTime = this.time.now - this.startTime;
        
        if (trial.type === 'go') {
            // Correct response on Go trial
            this.recordResponse(trial, reactionTime, 'correct');
            this.showFeedback('✓', 0x00ff00);
        } else {
            // Incorrect response on No-Go trial (false alarm)
            this.recordResponse(trial, reactionTime, 'false_alarm');
            this.showFeedback('✗', 0xff0000);
        }
        
        this.isResponding = false;
        this.time.delayedCall(500, this.nextTrial, [], this);
    }

    recordResponse(trial, reactionTime, result) {
        this.results.push({
            trial: this.currentTrial + 1,
            type: trial.type,
            stimulus: trial.stimulus,
            reactionTime: reactionTime,
            result: result,
            timestamp: new Date().toISOString()
        });
    }

    showFeedback(text, color) {
        if (this.feedbackText) {
            this.feedbackText.destroy();
        }
        
        this.feedbackText = this.add.text(
            400, 400,
            text,
            { 
                fontSize: '64px', 
                fill: `#${color.toString(16)}`,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
    }

    nextTrial() {
        this.currentTrial++;
        this.time.delayedCall(500, this.startTrial, [], this);
    }

    async endGame() {
        // Calculate performance metrics
        const results = this.results;
        const totalTrials = results.length;
        const goTrials = results.filter(r => r.type === 'go');
        const noGoTrials = results.filter(r => r.type === 'nogo');
        
        const correctResponses = goTrials.filter(r => r.result === 'correct').length;
        const omissions = goTrials.filter(r => r.result === 'timeout').length;
        const falseAlarms = noGoTrials.filter(r => r.result === 'false_alarm').length;
        const correctRejections = noGoTrials.filter(r => r.result === 'timeout').length;
        
        const avgReactionTime = goTrials
            .filter(r => r.reactionTime)
            .reduce((sum, r) => sum + r.reactionTime, 0) / correctResponses || 0;
        
        // Prepare data for database
        const experimentData = {
            participant_id: nickname,
            total_trials: totalTrials,
            go_trials: goTrials.length,
            nogo_trials: noGoTrials.length,
            correct_responses: correctResponses,
            omissions: omissions,
            false_alarms: falseAlarms,
            correct_rejections: correctRejections,
            avg_reaction_time: avgReactionTime,
            results: JSON.stringify(results),
            timestamp: new Date().toISOString()
        };
        
        // Save to database
        await updateDatabase(experimentData, 'gonogo');
        
        // Show completion screen
        this.showCompletionScreen();
    }

    showCompletionScreen() {
        this.cameras.main.setBackgroundColor('#000000');
        this.children.each(child => child.destroy());
        
        const results = this.results;
        const goTrials = results.filter(r => r.type === 'go');
        const noGoTrials = results.filter(r => r.type === 'nogo');
        const correctResponses = goTrials.filter(r => r.result === 'correct').length;
        const falseAlarms = noGoTrials.filter(r => r.result === 'false_alarm').length;
        const omissions = goTrials.filter(r => r.result === 'timeout').length;
        const correctRejections = noGoTrials.filter(r => r.result === 'timeout').length;
        
        const scoreText = `Task Complete!\n\n` +
            `Correct Responses: ${correctResponses}/${goTrials.length}\n` +
            `False Alarms: ${falseAlarms}\n` +
            `Omissions: ${omissions}\n` +
            `Correct Rejections: ${correctRejections}\n` +
            `Average Reaction Time: ${(results
                .filter(r => r.reactionTime)
                .reduce((sum, r) => sum + r.reactionTime, 0) / 
                (results.length - omissions - falseAlarms) || 0).toFixed(0)}ms\n\n` +
            `Press SPACEBAR to see high scores`;
            
        const text = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            scoreText,
            {
                fontSize: '24px',
                fill: '#ffffff',
                align: 'center',
                lineSpacing: 10
            }
        ).setOrigin(0.5);
        
        this.spaceKey.off('down');
        this.spaceKey.on('down', () => {
            this.showHighScores();
        });
    }

    async showHighScores() {
        const scores = await getHighscores(
            'gonogo',
            'correct_responses',
            false,
            (data) => data
        );
        
        this.cameras.main.setBackgroundColor('#000000');
        this.children.each(child => child.destroy());
        
        let y = 100;
        const style = { font: '24px Arial', fill: '#ffffff', align: 'center' };
        
        this.add.text(400, 50, 'High Scores', { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(200, 80, 'Name', style);
        this.add.text(500, 80, 'Score', style);
        
        scores.slice(0, 10).forEach((score, index) => {
            this.add.text(200, y + 40 * (index + 1), `${index + 1}. ${score.participant_id || 'Anonymous'}`, style);
            this.add.text(500, y + 40 * (index + 1), score.correct_responses || 0, style);
        });
    }
}

// Initialize game
const config = PsyExpBaseConfig([InstructionsScene, GameScene]);
const game = new Phaser.Game(config);
