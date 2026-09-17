import { PsyExpBaseConfig,
         fetchMessages,
         font,
         updateDatabase,
         getHighscores,
         displayHighscores,
         getCookie,
         createRebootButton
       } from '../../psyexp_core.js';

const activeLang = getCookie('language') || 'en-us';
const messageMap = await fetchMessages(activeLang, "nback");

// Instructions Scene
class InstructionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionsScene' });
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#000000');

        const briefingText = messageMap["BRIEFING"] ||
            "N-Back Working Memory Task\n\n" +
            "In this task, letters will appear one by one on the screen.\n" +
            "Your goal is to decide if the CURRENT letter matches the letter shown 2 steps back.\n\n" +
            "• Press 'Y' or click the Green [Y] button if it MATCHES (Yes).\n" +
            "• Press 'N' or click the Red [N] button if it DOES NOT match (No).\n\n" +
            "Press SPACEBAR or CLICK anywhere to begin.";

        this.add.text(W * 0.5, H * 0.15, "N-Back Task (2-Back)", { fontSize: '48px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.5, briefingText, {
            fontSize: '28px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 12,
            wordWrap: { width: W - 200 }
        }).setOrigin(0.5);

        const startNext = () => this.scene.start('NBackTaskScene');
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', startNext);
        this.input.once('pointerdown', startNext);
    }
}

// N-Back Task Scene
class NBackTaskScene extends Phaser.Scene {
    constructor() {
        super({ key: 'NBackTaskScene' });
        this.stimuli = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

        this.nBackValue = 2; // 2-Back level
        this.sequence = [];
        this.currentStimulusIndex = 0;
        this.inputEnabled = false;
        this.responseKeys = ['Y', 'N'];
        this.nStimulus = 25;

        this.userResponses = [];
        this.userResults = [];
        this.stimulusStartTime = 0;
        this.userRespondedCurrentTrial = false;
    }

    drawButton(color, text, x, y, size, onClick = () => {}) {
        const button = this.add.rectangle(x, y, size, size, color).setOrigin(0.5);
        button.text = this.add.text(x, y, text, { fontSize: size * 0.7, fill: '#fff' }).setOrigin(0.5);

        button.setInteractive();
        button.on('pointerdown', onClick);
        return button;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        this.userResponses = [];
        this.userResults = [];
        this.currentStimulusIndex = 0;
        this.userRespondedCurrentTrial = false;

        this.feedbackMessage = this.add.text(W * 0.5, H * 0.2, '', { fontSize: 72, fill: '#fff' }).setOrigin(0.5);
        const size = 150;

        this.stimulusBacklight = this.add.rectangle(W * 0.5, H * 0.5, size * 1.2, size * 1.2, 0xffffff).setOrigin(0.5);
        this.stimulusBackground = this.add.rectangle(W * 0.5, H * 0.5, size, size, 0xffffff).setOrigin(0.5);
        this.stimulusDisplay = this.add.text(W * 0.5, H * 0.5, '', { fontSize: size * 0.9, fill: '#000' }).setOrigin(0.5);

        this.helpMessage = this.add.text(
            W * 0.5,
            H * 0.9,
            messageMap['HELP_MESSAGE'] || 'Press Y for match, N for no match.',
            { fontSize: '24px', fill: '#fff' }
        ).setOrigin(0.5);
        
        this.input.keyboard.on('keydown', this.handleInput, this);

        this.buttonYes = this.drawButton(0x00d000, "Y", W * 0.7, H * 0.7, 150, () => this.checkAnswer(true));
        this.buttonNo = this.drawButton(0xd00000, "N", W * 0.3, H * 0.7, 150, () => this.checkAnswer(false));

        this.createHelpLayer();
        this.startTask();
    }

    createHelpLayer() {
        this.helpMode = true;

        this.helperButtonSet = Array(this.nBackValue).fill(null).map((_, i) => {
            return this.drawButton(i === 0 ? 0x505050 : 0xa0a0a0, '', W * (0.4 - 0.1 * i), H * 0.5, 120, () => null).setOrigin(0.5);
        });

        this.helpText = this.add.text(
            W * (0.5 - 0.1 * this.nBackValue),
            H * 0.4,
            messageMap["HELP_LAYER_MESSAGE"] || 'The answer is "YES" ("Y") when this symbol is equal to the last 2-back symbol.',
            { fontSize: '24px', fill: '#fff' }
        ).setOrigin(0.5);
    }

    updateHelpLayer() {
        if (!this.helpMode) return;

        this.helperButtonSet.forEach((button, i) => {
            button.text.setText(this.sequence[this.currentStimulusIndex - 1 - i] || '');
        });
    }

    destroyHelpLayer() {
        if (!this.helpMode) return;
        this.helpMode = false;
        if (this.helpText) this.helpText.destroy();
        if (this.helperButtonSet) {
            this.helperButtonSet.forEach((button) => {
                if (button.text) button.text.destroy();
                button.destroy();
            });
        }
    }

    startTask() {
        this.sequence = this.generateSequence();
        this.displayStimulus();
    }

    generateSequence() {
        // Guarantee ~30% target matches for scientifically valid N-Back testing
        const seq = new Array(this.nStimulus);
        const eligibleTrials = this.nStimulus - this.nBackValue;
        const targetCount = Math.round(eligibleTrials * 0.3); // ~7 targets for 23 eligible trials

        // Select target indices randomly from eligible indices (nBackValue to nStimulus - 1)
        const eligibleIndices = [];
        for (let i = this.nBackValue; i < this.nStimulus; i++) {
            eligibleIndices.push(i);
        }
        Phaser.Utils.Array.Shuffle(eligibleIndices);
        const targetIndices = new Set(eligibleIndices.slice(0, targetCount));

        // Generate sequence fulfilling targets and non-targets
        for (let i = 0; i < this.nStimulus; i++) {
            if (i >= this.nBackValue && targetIndices.has(i)) {
                seq[i] = seq[i - this.nBackValue];
            } else {
                let candidate;
                do {
                    candidate = this.stimuli[Phaser.Math.Between(0, this.stimuli.length - 1)];
                } while (i >= this.nBackValue && candidate === seq[i - this.nBackValue]);
                seq[i] = candidate;
            }
        }
        return seq;
    }

    displayStimulus() {
        if (this.currentStimulusIndex === 5) {
            this.destroyHelpLayer();
        }

        if (this.currentStimulusIndex < this.sequence.length) {
            this.userRespondedCurrentTrial = false;
            this.stimulusDisplay.setText(this.sequence[this.currentStimulusIndex]);
            this.updateHelpLayer();

            this.stimulusBacklight.setAlpha(1.0);
            this.time.delayedCall(100, () => this.stimulusBacklight.setAlpha(0.0), [], this);

            this.inputEnabled = true;
            this.stimulusStartTime = this.time.now;
            this.userResponses.push(null);

            this.trialTimer = this.time.delayedCall(2000, this.nextStimulus, [], this);
        } else {
            this.endTask();
        }
    }

    nextStimulus() {
        // If user didn't respond before timeout and trial is eligible (>= nBackValue)
        if (!this.userRespondedCurrentTrial && this.currentStimulusIndex >= this.nBackValue && this.currentStimulusIndex < this.sequence.length) {
            const isMatch = this.checkMatch();
            const category = isMatch ? 'miss' : 'omission';
            this.userResults.push({
                trial: this.currentStimulusIndex + 1,
                stimulus: this.sequence[this.currentStimulusIndex],
                target: isMatch,
                userAnswer: null,
                isCorrect: false,
                category: category,
                rt: null
            });
        }

        this.inputEnabled = false;
        this.currentStimulusIndex++;
        this.displayStimulus();
    }

    handleInput(event) {
        if (!this.inputEnabled || this.userRespondedCurrentTrial) return;

        const key = event.key.toUpperCase();
        if (!this.responseKeys.includes(key)) return;

        if (key === 'Y') this.checkAnswer(true);
        if (key === 'N') this.checkAnswer(false);
    }

    checkAnswer(userAnswer) {
        if (this.currentStimulusIndex < this.nBackValue || !this.inputEnabled || this.userRespondedCurrentTrial) {
            return;
        }

        this.userRespondedCurrentTrial = true;
        this.inputEnabled = false;

        const rt = this.time.now - this.stimulusStartTime;
        const isMatch = this.checkMatch();
        const isCorrect = (isMatch === userAnswer);

        this.userResponses[this.currentStimulusIndex] = userAnswer;

        let category;
        if (isMatch && userAnswer) category = 'hit';
        else if (isMatch && !userAnswer) category = 'miss';
        else if (!isMatch && !userAnswer) category = 'correct_rejection';
        else category = 'false_alarm';

        this.userResults.push({
            trial: this.currentStimulusIndex + 1,
            stimulus: this.sequence[this.currentStimulusIndex],
            target: isMatch,
            userAnswer: userAnswer,
            isCorrect: isCorrect,
            category: category,
            rt: rt
        });

        this.displayResult(isCorrect);
    }

    checkMatch() {
        if (this.currentStimulusIndex >= this.nBackValue) {
            return this.sequence[this.currentStimulusIndex] === this.sequence[this.currentStimulusIndex - this.nBackValue];
        }
        return false;
    }

    displayResult(result) {
        const color = result ? 0x00d000 : 0xd00000;
        const message = result ? 'Correct' : 'Incorrect';

        this.feedbackMessage.setTint(color);
        this.feedbackMessage.setText(message);

        this.time.delayedCall(800, () => {
            this.feedbackMessage.setTint(0xffffff);
            this.feedbackMessage.setText('');
        });
    }

    async endTask() {
        this.input.keyboard.off('keydown', this.handleInput, this);

        const totalEligible = this.nStimulus - this.nBackValue;
        const correctCount = this.userResults.filter(r => r.isCorrect).length;
        const winRatio = totalEligible > 0 ? correctCount / totalEligible : 0;

        const hits = this.userResults.filter(r => r.category === 'hit').length;
        const misses = this.userResults.filter(r => r.category === 'miss').length;
        const falseAlarms = this.userResults.filter(r => r.category === 'false_alarm').length;
        const correctRejections = this.userResults.filter(r => r.category === 'correct_rejection').length;
        const omissions = this.userResults.filter(r => r.category === 'omission').length;

        const validRTs = this.userResults.filter(r => r.rt !== null).map(r => r.rt);
        const avgRT = validRTs.length > 0 ? validRTs.reduce((a, b) => a + b, 0) / validRTs.length : 0;

        const experimentPayload = {
            userResponses: this.userResponses,
            userResults: this.userResults,
            winRatio: winRatio,
            nBackValue: this.nBackValue,
            totalEligible: totalEligible,
            correctCount: correctCount,
            hits: hits,
            misses: misses,
            falseAlarms: falseAlarms,
            correctRejections: correctRejections,
            omissions: omissions,
            avgRT: avgRT
        };

        await updateDatabase(experimentPayload, "nback");

        this.showCompletionScreen(experimentPayload);
    }

    showCompletionScreen(payload) {
        this.children.each(c => c.destroy());
        this.cameras.main.setBackgroundColor('#000000');

        const accuracyPct = (payload.winRatio * 100).toFixed(2);

        const summaryText = [
            `Task Complete!`,
            ``,
            `Accuracy: ${accuracyPct}% (${payload.correctCount}/${payload.totalEligible})`,
            `Hits (Target Yes): ${payload.hits}  |  False Alarms: ${payload.falseAlarms}`,
            `Correct Rejections (Non-target No): ${payload.correctRejections}`,
            `Misses & Omissions: ${payload.misses + payload.omissions}`,
            `Average Reaction Time: ${payload.avgRT.toFixed(0)} ms`,
            ``,
            `Click anywhere or press SPACEBAR to view High Scores`
        ].join('\n');

        this.add.text(W * 0.5, H * 0.2, "Task Completed!", { fontSize: '48px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.55, summaryText, {
            fontSize: '26px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        const goToHighscores = () => this.showHighscores();
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', goToHighscores);
        this.input.once('pointerdown', goToHighscores);
    }

    async showHighscores() {
        this.children.each(c => c.destroy());
        this.cameras.main.setBackgroundColor('#000000');

        const cx = W * 0.5;
        this.add.text(cx, H * 0.1, "High Scores", { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        let scores = [];
        try {
            scores = await getHighscores("nback", "experiment_payload -> winRatio DESC", false);
        } catch (e) {
            console.error("Failed to load nback highscores", e);
        }

        const styleHeader = { fontSize: '24px', fill: '#ffff00', fontStyle: 'bold' };
        const styleRow = { fontSize: '22px', fill: '#ffffff' };

        this.add.text(W * 0.2, H * 0.2, "Rank", styleHeader);
        this.add.text(W * 0.35, H * 0.2, "Player", styleHeader);
        this.add.text(W * 0.65, H * 0.2, "Accuracy", styleHeader);
        this.add.text(W * 0.8, H * 0.2, "Avg RT", styleHeader);

        let y = H * 0.28;
        (scores || []).slice(0, 10).forEach((scoreRow, idx) => {
            const name = scoreRow.nickname || 'Anonymous';
            const payload = scoreRow.experiment_payload || {};
            const scoreVal = payload.winRatio !== undefined ? `${(payload.winRatio * 100).toFixed(2)}%` : 'N/A';
            const rtVal = payload.avgRT !== undefined ? `${Math.round(payload.avgRT)} ms` : '-';

            this.add.text(W * 0.2, y, `${idx + 1}.`, styleRow);
            this.add.text(W * 0.35, y, name, styleRow);
            this.add.text(W * 0.65, y, scoreVal, styleRow);
            this.add.text(W * 0.8, y, rtVal, styleRow);
            y += H * 0.05;
        });

        createRebootButton(this, cx, H * 0.9, () => {
            this.sequence = [];
            this.currentStimulusIndex = 0;
            this.userResponses = [];
            this.userResults = [];
            this.scene.start('InstructionsScene');
        });
    }
}

// Bootstrap Game
const config = PsyExpBaseConfig([InstructionsScene, NBackTaskScene]);
const game = new Phaser.Game(config);

const W = game.config.width;
const H = game.config.height;
