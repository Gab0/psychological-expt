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
const messageMap = await fetchMessages("en-us", "2d-psychometry");
const root = window.location.href.replace(/\/$/, "");

// Global game state
const GameState = {
    currentLevel: 1,
    totalLevels: 4,
    currentTime: 0,  // Start at 0, each level adds 30s
    totalJumps: 0,
    totalCrowCollisions: 0,
    startTimestamp: null,
    levelStartTime: 0,
    totalHamburgers: 0,  // Total hamburgers collected across all levels
    levelHamburgers: 0   // Hamburgers collected in current level
};

// Level configurations
const LevelConfigs = {
    1: { platforms: 2, holes: 0, crows: 20 },
    2: { platforms: 5, holes: 2, crows: 30 },
    3: { platforms: 10, holes: 10, crows: 60 },
    4: { platforms: 13, holes: 15, crows: 80 }
};

// Instructions Scene - Part 1
class InstructionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionsScene' });
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Reset game state
        GameState.currentLevel = 1;
        GameState.currentTime = 0;  // Start at 0, each level adds 30s
        GameState.totalJumps = 0;
        GameState.totalCrowCollisions = 0;
        GameState.totalHamburgers = 0;
        GameState.levelHamburgers = 0;
        GameState.startTimestamp = Date.now();

        // Background
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Add semi-transparent overlay
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.7);
        graphics.fillRect(0, 0, W, H);

        // Title
        this.add.text(W * 0.5, H * 0.12, '2D PLATFORMER', {
            fontSize: '64px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Instructions text - Part 1
        const instructionsText =
            "OBJECTIVE: Complete all 3 levels before time runs out!\n\n" +
            "KEYBOARD CONTROLS:\n" +
            "  • Arrow keys or A/D to move left/right\n" +
            "  • SPACE or UP arrow to jump\n" +
            "  • You can DOUBLE JUMP!\n" +
            "  • DOWN arrow or S to FART BOOST 💨\n" +
            "  • R to restart level\n\n" +
            "TOUCH CONTROLS (Mobile):\n" +
            "  • Tap TOP of screen to JUMP\n" +
            "  • Tap LEFT side to move LEFT\n" +
            "  • Tap RIGHT side to move RIGHT\n\n" +
            "LEVELS:\n" +
            "  • Level 1: 2 platforms, 20 crows\n" +
            "  • Level 2: 5 platforms, 2 holes, 30 crows\n" +
            "  • Level 3: 10 platforms, 10 holes, 60 crows\n" +
            "  • Level 4: 13 platforms, 15 holes, 80 crows";

        this.add.text(W * 0.5, H * 0.53, instructionsText, {
            fontSize: '24px',
            fill: '#ffffff',
            wordWrap: { width: W - 200 },
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        // Continue prompt
        this.add.text(W * 0.5, H * 0.88, 'Press SPACEBAR or CLICK/TAP to continue...', {
            fontSize: '28px',
            fill: '#ffff00',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Continue on spacebar
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.nextScreen();
        });

        // Continue on click/touch
        this.input.on('pointerdown', () => {
            this.nextScreen();
        });
    }

    nextScreen() {
        this.scene.start('InstructionsScene2');
    }
}

// Instructions Scene - Part 2
class InstructionsScene2 extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionsScene2' });
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Background
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Add semi-transparent overlay
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.7);
        graphics.fillRect(0, 0, W, H);

        // Title
        this.add.text(W * 0.5, H * 0.12, '2D PLATFORMER', {
            fontSize: '64px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Instructions text - Part 2
        const instructionsText =
            "🍔 HAMBURGERS:\n" +
            "  • Eating makes you FATTER & SLOWER!\n" +
            "  • BUT increases your final score!\n" +
            "  • Can be used to FART BOOST!\n\n" +
            "💨 FART BOOST:\n" +
            "  • Requires: 1 hamburger (consumes it)\n" +
            "  • Press DOWN to charge 0.3 sec\n" +
            "  • BLAST diagonally upward!\n" +
            "  • Reach high platforms!\n\n" +
            "COUNTDOWN TIMER:\n" +
            "  • Each level: +30 seconds\n" +
            "  • Crow touch: -1 second\n" +
            "  • Final score = burgers×10 + seconds×5";

        this.add.text(W * 0.5, H * 0.53, instructionsText, {
            fontSize: '26px',
            fill: '#ffffff',
            wordWrap: { width: W - 200 },
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Start prompt
        this.add.text(W * 0.5, H * 0.88, 'Press SPACEBAR or CLICK/TAP to START!', {
            fontSize: '32px',
            fill: '#00ff00',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Start on spacebar
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.spaceKey.on('down', () => {
            this.startGame();
        });

        // Start on click/touch
        this.input.on('pointerdown', () => {
            this.startGame();
        });
    }

    startGame() {
        this.scene.start('GameScene', { level: 1, timeBonus: 30 });
    }
}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Level state
        this.currentLevel = 1;
        this.levelConfig = null;

        // Player state
        this.jumpCount = 0;
        this.levelJumps = 0;
        this.levelCrowCollisions = 0;

        // Timer state
        this.timerEvent = null;

        // Game state
        this.gameState = 'playing';
    }

    init(data) {
        this.currentLevel = data.level || 1;
        this.timeBonus = data.timeBonus || 30;  // Default 30s for each level
        this.levelConfig = LevelConfigs[this.currentLevel];
    }

    preload() {
        // Create procedural animated sprites
        this.createPlayerSpritesheet();
        this.createCrowSpritesheet();
        this.createPlatformTile();
        this.createDoorSprite();
        this.createClockSprite();
        this.createHamburgerSprite();
    }

    createPlayerSpritesheet() {
        // Create idle animation frames (4 frames) - SIDE VIEW like Super Mario Bros
        for (let frame = 0; frame < 4; frame++) {
            const graphics = this.add.graphics();
            const breathe = Math.sin(frame * Math.PI / 2) * 1;

            // Body (dark overalls - side view)
            graphics.fillStyle(0x1a1a2e, 1);
            graphics.fillRect(20, 28 + breathe, 24, 30); // Main torso

            // Arm
            graphics.fillStyle(0x1a1a2e, 1);
            graphics.fillRect(26, 38 + breathe, 10, 4); // Arm

            // Head (side profile)
            graphics.fillStyle(0xffdbac, 1);
            graphics.fillCircle(30, 22, 11); // Head circle

            // White hair on top and back
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(28, 14, 8); // Top hair
            graphics.fillCircle(22, 18, 6); // Back hair
            graphics.fillCircle(32, 16, 7); // Front top hair

            // Nose (profile) - MORE PROMINENT
            graphics.fillStyle(0xffdbac, 1);
            graphics.fillRect(38, 22, 6, 5); // Larger nose

            // Nose tip (darker for definition)
            graphics.fillStyle(0xd4a574, 1);
            graphics.fillCircle(42, 24, 2);

            // Eye (larger for visibility)
            graphics.fillStyle(0x000000, 1);
            graphics.fillCircle(34, 20, 3);

            // Glasses frame (black) - makes direction very clear
            graphics.lineStyle(2, 0x000000, 1);
            graphics.strokeCircle(34, 20, 5); // Circular lens
            graphics.lineBetween(29, 20, 26, 18); // Temple going back

            // Legs (side view - standing)
            graphics.fillStyle(0x1a1a2e, 1);
            graphics.fillRect(24, 58 + breathe, 8, 6); // Front leg
            graphics.fillRect(28, 58 + breathe, 8, 6); // Back leg (slightly overlapped)

            // Shoes
            graphics.fillStyle(0x654321, 1);
            graphics.fillRect(22, 63 + breathe, 10, 3);
            graphics.fillRect(28, 63 + breathe, 10, 3);

            graphics.generateTexture(`player-idle-${frame}`, 64, 64);
            graphics.destroy();
        }

        // Create run animation frames (6 frames) - SIDE VIEW with alternating legs
        for (let frame = 0; frame < 6; frame++) {
            const graphics = this.add.graphics();
            const bobOffset = Math.sin(frame * Math.PI / 3) * 2;

            // Body (dark overalls - side view, slightly tilted forward when running)
            graphics.fillStyle(0x1a1a2e, 1);
            graphics.fillRect(22, 28 + bobOffset, 22, 30);

            // Arm swing animation
            const armSwing = Math.sin(frame * Math.PI / 3) * 6;
            graphics.fillStyle(0x1a1a2e, 1);
            graphics.fillRect(28, 36 + bobOffset + armSwing, 10, 4);

            // Head (side profile - bobbing)
            graphics.fillStyle(0xffdbac, 1);
            graphics.fillCircle(31, 22 + bobOffset, 11);

            // White hair on top and back
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(29, 14 + bobOffset, 8);
            graphics.fillCircle(23, 18 + bobOffset, 6);
            graphics.fillCircle(33, 16 + bobOffset, 7);

            // Nose (profile) - MORE PROMINENT
            graphics.fillStyle(0xffdbac, 1);
            graphics.fillRect(39, 22 + bobOffset, 6, 5); // Larger nose

            // Nose tip (darker for definition)
            graphics.fillStyle(0xd4a574, 1);
            graphics.fillCircle(43, 24 + bobOffset, 2);

            // Eye (larger for visibility)
            graphics.fillStyle(0x000000, 1);
            graphics.fillCircle(35, 20 + bobOffset, 3);

            // Glasses frame (black) - makes direction very clear
            graphics.lineStyle(2, 0x000000, 1);
            graphics.strokeCircle(35, 20 + bobOffset, 5); // Circular lens
            graphics.lineBetween(30, 20 + bobOffset, 27, 18 + bobOffset); // Temple going back

            // Animated legs (side view - running motion)
            const leg1Forward = Math.sin(frame * Math.PI / 3) * 8;
            const leg2Forward = -Math.sin(frame * Math.PI / 3) * 8;

            graphics.fillStyle(0x1a1a2e, 1);
            // Front leg
            graphics.fillRect(26 + leg1Forward, 58 + bobOffset, 8, 6);
            // Back leg
            graphics.fillRect(26 + leg2Forward, 58 + bobOffset, 8, 6);

            // Shoes with running animation
            graphics.fillStyle(0x654321, 1);
            graphics.fillRect(24 + leg1Forward, 63 + bobOffset, 10, 3);
            graphics.fillRect(24 + leg2Forward, 63 + bobOffset, 10, 3);

            graphics.generateTexture(`player-run-${frame}`, 64, 64);
            graphics.destroy();
        }
    }

    createCrowSpritesheet() {
        // Create walk animation frames (4 frames)
        for (let frame = 0; frame < 4; frame++) {
            const graphics = this.add.graphics();

            // Body (black)
            graphics.fillStyle(0x000000, 1);
            const bodyBob = Math.sin(frame * Math.PI / 2) * 2;
            graphics.fillRect(8, 8 + bodyBob, 32, 16);
            graphics.fillCircle(12, 12 + bodyBob, 8);

            // Beak (yellow)
            graphics.fillStyle(0xffaa00, 1);
            graphics.fillTriangle(4, 12 + bodyBob, -4, 10 + bodyBob, -4, 14 + bodyBob);

            // Eye (white)
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(10, 10 + bodyBob, 2);

            // Legs
            graphics.lineStyle(2, 0x000000);
            const leg1X = 16 + Math.sin(frame * Math.PI / 2) * 4;
            const leg2X = 28 - Math.sin(frame * Math.PI / 2) * 4;
            graphics.lineBetween(16, 24 + bodyBob, leg1X, 30);
            graphics.lineBetween(28, 24 + bodyBob, leg2X, 30);

            graphics.generateTexture(`crow-walk-${frame}`, 48, 32);
            graphics.destroy();
        }
    }

    createPlatformTile() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRect(0, 0, 64, 64);
        graphics.lineStyle(2, 0x654321);
        graphics.strokeRect(0, 0, 64, 64);
        graphics.generateTexture('platform-tile', 64, 64);
        graphics.destroy();
    }

    createDoorSprite() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x00aa00, 1);
        graphics.fillRect(0, 0, 80, 120);
        graphics.lineStyle(4, 0x006600);
        graphics.strokeRect(0, 0, 80, 120);
        graphics.fillStyle(0xffdd00, 1);
        graphics.fillCircle(65, 60, 6);
        graphics.generateTexture('door', 80, 120);
        graphics.destroy();
    }

    createClockSprite() {
        const graphics = this.add.graphics();

        // Clock circle
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(32, 32, 28);

        // Clock border
        graphics.lineStyle(3, 0x000000);
        graphics.strokeCircle(32, 32, 28);

        // Clock hands
        graphics.lineStyle(3, 0xff0000);
        // Hour hand pointing up
        graphics.lineBetween(32, 32, 32, 15);
        // Minute hand pointing right
        graphics.lineBetween(32, 32, 45, 32);

        // Center dot
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(32, 32, 3);

        // "-1s" text (simple representation using shapes)
        graphics.fillStyle(0xff0000, 1);
        graphics.fillRect(20, 48, 8, 2); // minus sign
        graphics.fillRect(30, 45, 6, 10); // "1"
        graphics.fillRect(38, 48, 6, 2); // "s"
        graphics.fillRect(38, 52, 6, 2);

        graphics.generateTexture('clock-icon', 64, 64);
        graphics.destroy();
    }

    createHamburgerSprite() {
        const graphics = this.add.graphics();

        // Bottom bun (golden brown)
        graphics.fillStyle(0xd2691e, 1);
        graphics.fillEllipse(24, 28, 40, 14);

        // Lettuce (green)
        graphics.fillStyle(0x32cd32, 1);
        graphics.fillEllipse(24, 22, 36, 8);

        // Patty (brown)
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillEllipse(24, 18, 38, 10);

        // Cheese (yellow)
        graphics.fillStyle(0xffd700, 1);
        graphics.fillEllipse(24, 14, 36, 6);

        // Top bun (golden brown with sesame seeds)
        graphics.fillStyle(0xdaa520, 1);
        graphics.fillEllipse(24, 10, 38, 16);

        // Sesame seeds (white dots)
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 6, 2);
        graphics.fillCircle(24, 4, 2);
        graphics.fillCircle(32, 6, 2);

        graphics.generateTexture('hamburger', 48, 32);
        graphics.destroy();
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Reset level state
        this.jumpCount = 0;
        this.levelJumps = 0;
        this.levelCrowCollisions = 0;
        this.gameState = 'playing';
        this.lastTouchJump = false;
        GameState.levelHamburgers = 0;
        this.playerFatness = 0; // Track how many hamburgers eaten (affects movement)
        this.isFarting = false; // Track fart boost state
        this.fartCooldown = false; // Prevent rapid farting

        // Apply time bonus from previous level
        if (this.timeBonus > 0) {
            GameState.currentTime += this.timeBonus;
            this.showTimeBonus(this.timeBonus);
        }

        GameState.levelStartTime = GameState.currentTime;

        // Set world bounds
        this.physics.world.setBounds(0, 0, 5760, H);

        // Sky background
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Create animations
        this.createAnimations();

        // Create level deterministically
        this.createLevel();

        // Create player
        this.createPlayer();

        // Setup camera
        this.setupCamera();

        // Spawn crows deterministically
        this.spawnCrows();

        // Spawn hamburgers deterministically
        this.spawnHamburgers();

        // Setup collisions
        this.setupCollisions();

        // Setup input
        this.setupInput();

        // Create UI
        this.createUI();

        // Start/continue timer
        this.startTimer();
    }

    createAnimations() {
        // Player idle animation
        if (!this.anims.exists('player-idle')) {
            this.anims.create({
                key: 'player-idle',
                frames: [
                    { key: 'player-idle-0' },
                    { key: 'player-idle-1' },
                    { key: 'player-idle-2' },
                    { key: 'player-idle-3' }
                ],
                frameRate: 6,
                repeat: -1
            });
        }

        // Player run animation
        if (!this.anims.exists('player-run')) {
            this.anims.create({
                key: 'player-run',
                frames: [
                    { key: 'player-run-0' },
                    { key: 'player-run-1' },
                    { key: 'player-run-2' },
                    { key: 'player-run-3' },
                    { key: 'player-run-4' },
                    { key: 'player-run-5' }
                ],
                frameRate: 12,
                repeat: -1
            });
        }

        // Crow walk animation
        if (!this.anims.exists('crow-walk')) {
            this.anims.create({
                key: 'crow-walk',
                frames: [
                    { key: 'crow-walk-0' },
                    { key: 'crow-walk-1' },
                    { key: 'crow-walk-2' },
                    { key: 'crow-walk-3' }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
    }

    showTimeBonus(seconds) {
        const bonusText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            `+${seconds} SECONDS!`,
            {
                fontSize: '64px',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 6,
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: bonusText,
            alpha: 0,
            y: bonusText.y - 100,
            duration: 2000,
            onComplete: () => bonusText.destroy()
        });
    }

    createLevel() {
        const H = this.sys.game.config.height;
        const groundLevel = H - 64; // Top of ground blocks at this level

        this.ground = this.physics.add.staticGroup();

        // Create ground with holes (deterministic)
        // Ground blocks extend from groundLevel downward into the "unseen area"
        const holes = this.generateHolePositions();

        for (let x = 0; x < 5760; x += 64) {
            const tileX = x + 32;
            // Check if this position is in a hole
            const isHole = holes.some(hole => x >= hole.start && x < hole.end);

            if (!isHole) {
                // Stack multiple tiles vertically to create thick ground coming from below
                // Top tile at ground level
                const topTile = this.ground.create(tileX, groundLevel + 32, 'platform-tile');
                topTile.setScale(1).refreshBody();

                // Additional tiles below to show ground extends downward
                const bottomTile = this.ground.create(tileX, groundLevel + 96, 'platform-tile');
                bottomTile.setScale(1).refreshBody();
            }
        }

        // Create floating platforms (deterministic)
        const platforms = this.generatePlatformPositions();
        platforms.forEach(platform => {
            this.createPlatform(platform.x, platform.y, platform.width);
        });

        // Create door at the end, sitting naturally on top of ground
        this.door = this.physics.add.sprite(5600, groundLevel - 60, 'door');
        this.door.setImmovable(true);
        this.door.body.allowGravity = false;

        // Pulsing door effect
        this.tweens.add({
            targets: this.door,
            alpha: 0.7,
            yoyo: true,
            repeat: -1,
            duration: 800
        });
    }

    generateHolePositions() {
        const holes = [];
        const holeCount = this.levelConfig.holes;

        if (holeCount === 0) return holes;

        // Deterministic hole generation using level as seed
        const seed = this.currentLevel * 1000;

        for (let i = 0; i < holeCount; i++) {
            // Distribute holes evenly across level
            const spacing = 5760 / (holeCount + 1);
            const baseX = spacing * (i + 1);

            // Deterministic variation
            const variation = ((seed + i * 137) % 200) - 100;
            const holeX = baseX + variation;

            // Hole width (3-5 tiles = 192-320 pixels)
            const holeWidth = 192 + ((seed + i * 71) % 129);

            holes.push({
                start: Math.max(200, holeX - holeWidth / 2),
                end: Math.min(5400, holeX + holeWidth / 2)
            });
        }

        return holes;
    }

    generatePlatformPositions() {
        const platforms = [];
        const platformCount = this.levelConfig.platforms;

        if (platformCount === 0) return platforms;

        // Deterministic platform generation
        const seed = this.currentLevel * 2000;

        for (let i = 0; i < platformCount; i++) {
            // Distribute platforms across level
            const spacing = 5000 / (platformCount + 1);
            const baseX = 500 + spacing * i;

            // Deterministic variation
            const xVariation = ((seed + i * 157) % 300) - 150;
            const platformX = baseX + xVariation;

            // Height variation (600-800)
            const platformY = 600 + ((seed + i * 97) % 201);

            // Width (2-4 tiles)
            const platformWidth = 2 + ((seed + i * 53) % 3);

            platforms.push({
                x: platformX,
                y: platformY,
                width: platformWidth
            });
        }

        return platforms;
    }

    createPlatform(x, y, tilesWide) {
        for (let i = 0; i < tilesWide; i++) {
            const tile = this.ground.create(x + (i * 64), y, 'platform-tile');
            tile.setScale(1).refreshBody();
        }
    }

    createPlayer() {
        this.player = this.physics.add.sprite(100, 700, 'player-idle-0');
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0);
        this.player.body.setSize(50, 60);
        this.player.body.setOffset(7, 4);

        // Start idle animation
        this.player.play('player-idle');

        // Initialize landing detection
        this.wasOnGround = false;
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, 5760, this.sys.game.config.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(400, 200);
    }

    spawnCrows() {
        this.crowGroup = this.physics.add.group();

        const crowCount = this.levelConfig.crows;
        const seed = this.currentLevel * 3000;

        for (let i = 0; i < crowCount; i++) {
            // Deterministic crow positioning
            const spacing = 5400 / crowCount;
            const baseX = 200 + spacing * i;
            const xVariation = ((seed + i * 113) % 200) - 100;
            const crowX = baseX + xVariation;

            const crow = this.crowGroup.create(crowX, 800, 'crow-walk-0');
            crow.setCollideWorldBounds(true);
            crow.setBounce(0);

            // Deterministic crow behavior - smooth, cool and SLOW (emphasized in spec)
            crow.setData('moveSpeed', 20 + ((seed + i * 83) % 21)); // 20-40 (very slow)
            crow.setData('direction', ((seed + i) % 2) * 2 - 1); // -1 or 1
            crow.setData('startX', crowX);
            crow.setData('patrolDistance', 150 + ((seed + i * 127) % 201)); // 150-350
            crow.setData('hitRecently', false);
            crow.setData('lastDirectionChange', 0); // Timestamp of last direction change

            // Start walk animation
            crow.play('crow-walk');
        }
    }

    spawnHamburgers() {
        this.hamburgerGroup = this.physics.add.group();

        // 10 hamburgers total across all levels - distribute based on level
        const hamburgersPerLevel = {
            1: 3,  // Level 1 gets 3 hamburgers
            2: 3,  // Level 2 gets 3 hamburgers
            3: 4,  // Level 3 gets 4 hamburgers
            4: 5   // Level 4 gets 5 hamburgers
        };

        const hamburgerCount = hamburgersPerLevel[this.currentLevel] || 0;
        const seed = this.currentLevel * 5000; // Different seed for hamburgers

        for (let i = 0; i < hamburgerCount; i++) {
            // Deterministic hamburger positioning - scattered across level
            const spacing = 5200 / (hamburgerCount + 1);
            const baseX = 400 + spacing * i;
            const xVariation = ((seed + i * 197) % 300) - 150;
            const hamburgerX = baseX + xVariation;

            // Random-ish height - can be on ground or on platforms
            const heightVariation = ((seed + i * 241) % 3);
            let hamburgerY;

            if (heightVariation === 0) {
                // On ground level
                hamburgerY = this.sys.game.config.height - 100;
            } else {
                // Floating at various heights
                hamburgerY = 400 + ((seed + i * 173) % 300);
            }

            const hamburger = this.hamburgerGroup.create(hamburgerX, hamburgerY, 'hamburger');
            hamburger.setCollideWorldBounds(true);
            hamburger.body.allowGravity = false;  // Float in air

            // Pulsing animation
            this.tweens.add({
                targets: hamburger,
                scaleX: 1.2,
                scaleY: 1.2,
                yoyo: true,
                repeat: -1,
                duration: 800,
                ease: 'Sine.easeInOut'
            });
        }
    }

    setupCollisions() {
        // Player vs Ground
        this.physics.add.collider(this.player, this.ground);

        // Crows vs Ground
        this.physics.add.collider(this.crowGroup, this.ground);

        // Player vs Crows
        this.physics.add.overlap(
            this.player,
            this.crowGroup,
            this.handleCrowCollision,
            null,
            this
        );

        // Player vs Door
        this.physics.add.overlap(
            this.player,
            this.door,
            this.handleDoorReached,
            null,
            this
        );

        // Player vs Hamburgers
        this.physics.add.overlap(
            this.player,
            this.hamburgerGroup,
            this.handleHamburgerCollision,
            null,
            this
        );
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.rKey = this.input.keyboard.addKey('R');

        // Restart level on R key
        this.rKey.on('down', () => {
            if (this.gameState === 'playing') {
                this.restartLevel();
            }
        });

        // Touch controls for smartphone - X-split screen (invisible)
        this.touchState = {
            left: false,
            right: false,
            jump: false
        };

        this.input.on('pointerdown', (pointer) => {
            this.handleTouch(pointer, true);
        });

        this.input.on('pointerup', (pointer) => {
            this.handleTouch(pointer, false);
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.handleTouch(pointer, true);
            }
        });
    }

    handleTouch(pointer, isDown) {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;
        const x = pointer.x;
        const y = pointer.y;

        // Determine which quadrant of the X was touched
        // X divides screen into 4 areas:
        // Top-left (above left diagonal): Jump (W/UP)
        // Top-right (above right diagonal): Move Right (D)
        // Bottom-left (below left diagonal): Move Left (A)
        // Bottom-right (below right diagonal): Down (not used)

        const centerX = W / 2;
        const centerY = H / 2;

        // Check if point is above or below the diagonals
        const aboveLeftDiagonal = (y - centerY) < (x - centerX); // y < x (relative to center)
        const aboveRightDiagonal = (y - centerY) < -(x - centerX); // y < -x (relative to center)

        // Determine quadrant
        if (aboveLeftDiagonal && aboveRightDiagonal) {
            // Top quadrant - Jump
            this.touchState.jump = isDown;
        } else if (aboveLeftDiagonal && !aboveRightDiagonal) {
            // Right quadrant - Move right
            this.touchState.right = isDown;
            this.touchState.left = false;
        } else if (!aboveLeftDiagonal && aboveRightDiagonal) {
            // Left quadrant - Move left
            this.touchState.left = isDown;
            this.touchState.right = false;
        } else {
            // Bottom quadrant - not used
            if (!isDown) {
                this.touchState.left = false;
                this.touchState.right = false;
            }
        }

        // Reset jump on release
        if (!isDown) {
            this.touchState.jump = false;
        }
    }

    restartLevel() {
        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.destroy();
        }

        // Restart current level with same time
        this.scene.restart({ level: this.currentLevel, timeBonus: 0 });
    }

    createUI() {
        const W = this.sys.game.config.width;

        // Level indicator (top left)
        this.levelText = this.add.text(50, 30, `LEVEL ${this.currentLevel}/${GameState.totalLevels}`, {
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontWeight: 'bold'
        }).setScrollFactor(0);

        // Timer (top center)
        this.timerText = this.add.text(W * 0.5, 40, 'Time: 0.0s', {
            fontSize: '48px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        // Current Score (below timer)
        this.scoreText = this.add.text(W * 0.5, 95, 'Score: 0', {
            fontSize: '36px',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4,
            fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        // FPS counter (top right)
        this.fpsText = this.add.text(W - 50, 30, 'FPS: 60', {
            fontSize: '24px',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0);

        // Hamburger counter (bottom left - top item) - shows individual sprites
        this.hamburgerContainer = this.add.container(50, this.sys.game.config.height - 160);
        this.hamburgerContainer.setScrollFactor(0);
        this.hamburgerSprites = []; // Array to hold individual hamburger sprites

        // Add label
        this.hamburgerLabel = this.add.text(0, 0, 'Burgers: ', {
            fontSize: '28px',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3,
            fontWeight: 'bold'
        });
        this.hamburgerContainer.add(this.hamburgerLabel);

        // Crow collisions (bottom left)
        this.collisionText = this.add.text(50, this.sys.game.config.height - 120, 'Crow Hits: 0', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setScrollFactor(0);

        // Jump counter (bottom left)
        this.jumpText = this.add.text(50, this.sys.game.config.height - 80, 'Jumps: 0', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setScrollFactor(0);

        // Speed indicator (bottom left)
        this.speedText = this.add.text(50, this.sys.game.config.height - 40, 'Speed: 100%', {
            fontSize: '24px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3
        }).setScrollFactor(0);

        // Restart hint
        this.add.text(W * 0.5, this.sys.game.config.height - 30, 'Press R to restart level', {
            fontSize: '20px',
            fill: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
    }

    startTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 100,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    updateTimer() {
        if (this.gameState !== 'playing') return;

        GameState.currentTime -= 0.1;  // COUNT DOWN

        // Check for game over
        if (GameState.currentTime <= 0) {
            GameState.currentTime = 0;
            this.gameOver();
            return;
        }

        // Update UI
        this.timerText.setText(`Time: ${GameState.currentTime.toFixed(1)}s`);

        // Visual warning when low
        if (GameState.currentTime < 10) {
            this.timerText.setFill('#ff0000');
        } else {
            this.timerText.setFill('#ffffff');
        }

        // Update FPS
        this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }

    applyTimePenalty(seconds) {
        GameState.currentTime -= seconds;  // DEDUCT seconds (countdown)

        // Ensure time doesn't go negative
        if (GameState.currentTime < 0) {
            GameState.currentTime = 0;
        }

        // Visual feedback - show dropping clock instead of red flash
        this.showDroppingClock();

        // Show penalty text
        this.showPenaltyFeedback(`-${seconds}s`);
    }

    showDroppingClock() {
        // Create a small clock icon that drops from the player
        const clock = this.add.sprite(this.player.x, this.player.y - 40, 'clock-icon');
        clock.setScale(0.5); // Make it small

        // Animate the clock dropping
        this.tweens.add({
            targets: clock,
            y: clock.y + 100,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeIn',
            onComplete: () => clock.destroy()
        });
    }

    showPenaltyFeedback(text) {
        const penalty = this.add.text(
            this.player.x,
            this.player.y - 50,
            text,
            { fontSize: '48px', fill: '#ff0000', fontWeight: 'bold', stroke: '#000000', strokeThickness: 3 }
        );

        this.tweens.add({
            targets: penalty,
            alpha: 0,
            y: penalty.y - 50,
            duration: 1000,
            onComplete: () => penalty.destroy()
        });
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Check if player fell through hole
        if (this.player.y > this.sys.game.config.height) {
            this.restartLevel();
            return;
        }

        // Update player
        this.updateFartBoost();

        if (!this.isFarting) {
            this.updatePlayerMovement();
            this.updatePlayerJump();
            this.updatePlayerAnimation();
        }

        // Update crows
        this.updateCrows();

        // Update UI
        this.updateUI();
    }

    updateFartBoost() {
        // Check if down key pressed and not on cooldown
        const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
                           Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('S'));

        // Only works when hamburgers are available (spec line 23)
        if (downPressed && !this.isFarting && !this.fartCooldown && GameState.totalHamburgers > 0) {
            this.isFarting = true;
            this.fartCooldown = true;

            // Consume one hamburger
            GameState.totalHamburgers--;
            this.playerFatness = Math.max(0, this.playerFatness - 1);

            // Stop player movement for 0.3 seconds
            this.player.setVelocity(0, 0);

            // Determine facing direction
            const facingLeft = this.player.flipX;
            const boostDirection = facingLeft ? -1 : 1;

            // Show EXPLICIT farting animation (multiple clouds)
            const fartClouds = [];
            for (let i = 0; i < 5; i++) {
                const cloud = this.add.text(
                    this.player.x + (Math.random() - 0.5) * 20,
                    this.player.y + 20 + (Math.random() - 0.5) * 10,
                    '💨',
                    { fontSize: (40 + Math.random() * 30) + 'px' }
                );
                fartClouds.push(cloud);

                this.tweens.add({
                    targets: cloud,
                    alpha: 0,
                    x: cloud.x - (boostDirection * (80 + Math.random() * 40)),
                    y: cloud.y + 40 + Math.random() * 30,
                    scale: 1.5 + Math.random(),
                    duration: 600 + Math.random() * 400,
                    delay: i * 60,
                    ease: 'Cubic.easeOut',
                    onComplete: () => cloud.destroy()
                });
            }

            // Show "FART!" text
            const fartText = this.add.text(
                this.player.x,
                this.player.y - 40,
                'FART!',
                {
                    fontSize: '36px',
                    fill: '#ff6600',
                    fontWeight: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5);

            this.tweens.add({
                targets: fartText,
                alpha: 0,
                y: fartText.y - 30,
                duration: 300,
                onComplete: () => fartText.destroy()
            });

            // After 0.3 seconds, apply diagonal boost
            this.time.delayedCall(300, () => {
                // Accelerate diagonally (facing direction + up)
                const boostSpeed = 700; // Strong boost
                this.player.setVelocity(boostSpeed * boostDirection, -boostSpeed);

                this.isFarting = false;

                // Reset cooldown after 0.5 seconds total
                this.time.delayedCall(200, () => {
                    this.fartCooldown = false;
                });
            });
        }
    }

    updatePlayerMovement() {
        const left = this.cursors.left.isDown || this.keyA.isDown || this.touchState.left;
        const right = this.cursors.right.isDown || this.keyD.isDown || this.touchState.right;

        // Base speed is 300, proportionally decreases with hamburgers
        // At 10 burgers: speed becomes 1/3 of original (spec line 28)
        // Reduction per burger: (1 - 1/3) / 10 = 2/3 / 10 = 0.06667
        const speedMultiplier = Math.max(1/3, 1 - (this.playerFatness * (2/3) / 10));
        const currentSpeed = 300 * speedMultiplier;

        if (left) {
            this.player.setVelocityX(-currentSpeed);
            this.player.flipX = true;
        } else if (right) {
            this.player.setVelocityX(currentSpeed);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }
    }

    updatePlayerJump() {
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        // Landing feedback
        if (onGround && this.jumpCount > 0 && !this.wasOnGround) {
            this.createLandingEffect(this.player.x, this.player.y + 32);
            // Squash effect on landing
            this.tweens.add({
                targets: this.player,
                scaleX: this.player.scaleX * 1.15,
                scaleY: this.player.scaleY * 0.85,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
        }

        if (onGround && this.jumpCount > 0) {
            this.jumpCount = 0;
        }

        this.wasOnGround = onGround;

        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                          Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                          Phaser.Input.Keyboard.JustDown(this.keyW);

        // Handle touch jump (edge detection)
        const touchJump = this.touchState.jump && !this.lastTouchJump;
        this.lastTouchJump = this.touchState.jump;

        if ((jumpPressed || touchJump) && this.jumpCount < 2) {
            // Jump speed decreases proportionally with hamburgers
            // At 10 burgers: jump becomes 1/3 of original (spec line 28)
            const speedMultiplier = Math.max(1/3, 1 - (this.playerFatness * (2/3) / 10));
            const jumpVelocity = -500 * speedMultiplier;

            this.player.setVelocityY(jumpVelocity);
            this.jumpCount++;
            this.levelJumps++;
            GameState.totalJumps++;

            // Jump feedback - squash and stretch
            this.tweens.add({
                targets: this.player,
                scaleX: this.player.scaleX * 0.9,
                scaleY: this.player.scaleY * 1.1,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });

            // Jump dust particles
            this.createJumpDust(this.player.x, this.player.y + 32, this.jumpCount === 2);

            // No time penalty for jumping (spec line 22: only crow touches deduct time)
        }
    }

    updatePlayerAnimation() {
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;
        const moving = Math.abs(this.player.body.velocity.x) > 10;

        if (onGround && moving) {
            if (this.player.anims.currentAnim?.key !== 'player-run') {
                this.player.play('player-run');
            }
        } else if (onGround && !moving) {
            if (this.player.anims.currentAnim?.key !== 'player-idle') {
                this.player.play('player-idle');
            }
        }
    }

    updateCrows() {
        const currentTime = this.time.now;

        this.crowGroup.children.entries.forEach(crow => {
            const speed = crow.getData('moveSpeed');
            let direction = crow.getData('direction');
            const startX = crow.getData('startX');
            const patrolDist = crow.getData('patrolDistance');
            const lastDirectionChange = crow.getData('lastDirectionChange');

            // Check if crow has exceeded patrol distance
            const distanceFromStart = crow.x - startX;

            // Minimum time between direction changes (500ms for visual comfort)
            const directionChangeCooldown = 500;

            // If crow exceeded patrol distance and enough time has passed, flip and constrain position
            if (Math.abs(distanceFromStart) > patrolDist &&
                (currentTime - lastDirectionChange) > directionChangeCooldown) {

                direction = -direction;
                crow.setData('direction', direction);
                crow.setData('lastDirectionChange', currentTime);

                // Constrain crow to patrol boundary to prevent oscillation
                if (distanceFromStart > 0) {
                    crow.x = startX + patrolDist;
                } else {
                    crow.x = startX - patrolDist;
                }
            }

            crow.setVelocityX(speed * direction);
            crow.flipX = direction > 0;
        });
    }

    updateUI() {
        this.jumpText.setText(`Jumps: ${this.levelJumps} (Total: ${GameState.totalJumps})`);
        this.collisionText.setText(`Crow Hits: ${this.levelCrowCollisions} (Total: ${GameState.totalCrowCollisions})`);

        // Update individual hamburger sprites
        this.updateHamburgerDisplay();

        // Update current score (burgers × time remaining)
        const currentScore = (GameState.totalHamburgers * 10) + Math.round(GameState.currentTime * 5);
        this.scoreText.setText(`Score: ${currentScore}`);

        // Update speed indicator based on fatness
        // Proportional reduction: at 10 burgers = 33.33% (1/3)
        const speedPercent = Math.round((Math.max(1/3, 1 - (this.playerFatness * (2/3) / 10))) * 100);
        this.speedText.setText(`Speed: ${speedPercent}%`);

        // Change color based on speed
        if (speedPercent >= 80) {
            this.speedText.setFill('#00ff00'); // Green - fast
        } else if (speedPercent >= 50) {
            this.speedText.setFill('#ffff00'); // Yellow - medium
        } else {
            this.speedText.setFill('#ff0000'); // Red - slow
        }
    }

    updateHamburgerDisplay() {
        // Clear existing hamburger sprites
        this.hamburgerSprites.forEach(sprite => sprite.destroy());
        this.hamburgerSprites = [];

        // Calculate label width to position hamburgers after it
        const labelWidth = 150; // Approximate width of "Burgers: " text

        // Add individual hamburger sprites
        for (let i = 0; i < GameState.totalHamburgers; i++) {
            const hamburgerIcon = this.add.text(
                labelWidth + (i * 32), // Space them 32 pixels apart
                0,
                '🍔',
                { fontSize: '28px' }
            );
            this.hamburgerSprites.push(hamburgerIcon);
            this.hamburgerContainer.add(hamburgerIcon);
        }
    }

    handleCrowCollision(player, crow) {
        if (crow.getData('hitRecently')) return;

        crow.setData('hitRecently', true);

        this.applyTimePenalty(1);
        this.levelCrowCollisions++;
        GameState.totalCrowCollisions++;

        // Prevent player from moving down during collision (spec line 26)
        if (player.body.velocity.y > 0) {
            player.setVelocityY(0);
        }

        // Visual feedback - camera shake
        this.cameras.main.shake(100, 0.005);

        // Create explosion effect
        this.createCrowExplosion(crow.x, crow.y);

        // Destroy the crow
        crow.destroy();
    }

    createCrowExplosion(x, y) {
        // Create multiple particles for explosion effect
        const particleCount = 12;
        const colors = [0x000000, 0x333333, 0xffaa00]; // Black, gray, orange

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Create particle graphic
            const particle = this.add.graphics();
            particle.fillStyle(color, 1);
            particle.fillCircle(0, 0, 3 + Math.random() * 3);
            particle.generateTexture('explosion-particle-' + i + '-' + Date.now(), 10, 10);
            particle.destroy();

            // Create sprite from texture
            const particleSprite = this.add.sprite(x, y, 'explosion-particle-' + i + '-' + Date.now());

            // Animate particle outward
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;

            this.tweens.add({
                targets: particleSprite,
                x: x + velocityX,
                y: y + velocityY,
                alpha: 0,
                scale: 0.2,
                duration: 500 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => particleSprite.destroy()
            });
        }

        // Show "POOF!" text
        const poofText = this.add.text(x, y - 30, 'POOF!', {
            fontSize: '24px',
            fill: '#ff0000',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: poofText,
            alpha: 0,
            y: poofText.y - 40,
            duration: 800,
            onComplete: () => poofText.destroy()
        });
    }

    createJumpDust(x, y, isDoubleJump) {
        // Create dust particles when jumping
        const particleCount = isDoubleJump ? 8 : 6;
        const dustColor = isDoubleJump ? 0x00ffff : 0xcccccc; // Cyan for double jump, gray for regular

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.6; // Downward spread
            const speed = 50 + Math.random() * 50;

            const particle = this.add.graphics();
            particle.fillStyle(dustColor, 1);
            particle.fillCircle(0, 0, 2 + Math.random() * 2);
            particle.generateTexture('dust-particle-' + i + '-' + Date.now(), 6, 6);
            particle.destroy();

            const particleSprite = this.add.sprite(x + (Math.random() - 0.5) * 20, y, 'dust-particle-' + i + '-' + Date.now());

            this.tweens.add({
                targets: particleSprite,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.3,
                duration: 300 + Math.random() * 200,
                ease: 'Cubic.easeOut',
                onComplete: () => particleSprite.destroy()
            });
        }

        // Special visual indicator for double jump
        if (isDoubleJump) {
            const doubleJumpText = this.add.text(x, y - 10, '⭐', {
                fontSize: '20px',
                fill: '#00ffff'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: doubleJumpText,
                alpha: 0,
                y: doubleJumpText.y - 30,
                rotation: Math.PI * 2,
                duration: 600,
                onComplete: () => doubleJumpText.destroy()
            });
        }
    }

    createLandingEffect(x, y) {
        // Create dust puff when landing
        const particleCount = 8;

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.PI + (i / particleCount) * Math.PI; // Spread sideways
            const speed = 40 + Math.random() * 40;

            const particle = this.add.graphics();
            particle.fillStyle(0xcccccc, 1);
            particle.fillCircle(0, 0, 3 + Math.random() * 2);
            particle.generateTexture('landing-dust-' + i + '-' + Date.now(), 8, 8);
            particle.destroy();

            const particleSprite = this.add.sprite(x + (Math.random() - 0.5) * 15, y, 'landing-dust-' + i + '-' + Date.now());

            this.tweens.add({
                targets: particleSprite,
                x: x + Math.cos(angle) * speed,
                y: y + 10,
                alpha: 0,
                scale: 0.5,
                duration: 400 + Math.random() * 200,
                ease: 'Sine.easeOut',
                onComplete: () => particleSprite.destroy()
            });
        }
    }

    handleHamburgerCollision(player, hamburger) {
        const hamburgerX = hamburger.x;
        const hamburgerY = hamburger.y;

        // Collect the hamburger
        hamburger.destroy();

        this.playerFatness++;
        GameState.levelHamburgers++;
        GameState.totalHamburgers++;

        // Make player "dramatically fatter" by scaling up
        const newScale = 1 + (this.playerFatness * 0.15); // Each hamburger adds 15% scale
        this.player.setScale(newScale);

        // Visual feedback - happy effect
        this.cameras.main.flash(150, 255, 215, 0, false); // Gold flash

        // Create hamburger collection particles (golden sparkles)
        this.createHamburgerParticles(hamburgerX, hamburgerY);

        // Player bounce effect
        this.tweens.add({
            targets: this.player,
            scaleX: this.player.scaleX * 1.2,
            scaleY: this.player.scaleY * 1.2,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        // Show feedback text
        const feedbackText = this.add.text(
            this.player.x,
            this.player.y - 60,
            '🍔 YUM!',
            { fontSize: '32px', fill: '#ffd700', fontWeight: 'bold', stroke: '#000000', strokeThickness: 3 }
        );

        this.tweens.add({
            targets: feedbackText,
            alpha: 0,
            y: feedbackText.y - 40,
            duration: 1000,
            onComplete: () => feedbackText.destroy()
        });
    }

    createHamburgerParticles(x, y) {
        // Create golden sparkle particles
        const particleCount = 15;
        const colors = [0xffd700, 0xffaa00, 0xffff00]; // Gold, orange, yellow

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 80 + Math.random() * 60;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const particle = this.add.graphics();
            particle.fillStyle(color, 1);
            // Create star-shaped particles
            const size = 3 + Math.random() * 3;
            particle.fillCircle(0, 0, size);
            particle.generateTexture('hamburger-particle-' + i + '-' + Date.now(), size * 2, size * 2);
            particle.destroy();

            const particleSprite = this.add.sprite(x, y, 'hamburger-particle-' + i + '-' + Date.now());

            this.tweens.add({
                targets: particleSprite,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed - 20, // Slight upward bias
                alpha: 0,
                scale: 0.3,
                rotation: Math.random() * Math.PI * 2,
                duration: 600 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => particleSprite.destroy()
            });
        }
    }

    handleDoorReached(player, door) {
        if (this.gameState === 'ended') return;

        // Visual feedback for reaching the door
        this.cameras.main.flash(200, 0, 255, 0, false); // Green flash

        // Door opening effect - scale animation
        this.tweens.add({
            targets: door,
            scaleY: 1.2,
            duration: 200,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        // Success particles around door
        this.createDoorSuccessParticles(door.x, door.y);

        // Show "LEVEL COMPLETE!" text
        const completeText = this.add.text(
            door.x,
            door.y - 80,
            '✓ LEVEL COMPLETE!',
            { fontSize: '28px', fill: '#00ff00', fontWeight: 'bold', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: completeText,
            alpha: 0,
            y: completeText.y - 50,
            duration: 1500,
            onComplete: () => completeText.destroy()
        });

        this.completeLevel();
    }

    createDoorSuccessParticles(x, y) {
        // Create green success particles
        const particleCount = 20;
        const colors = [0x00ff00, 0x00cc00, 0x00ff88]; // Various greens

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 100 + Math.random() * 80;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const particle = this.add.graphics();
            particle.fillStyle(color, 1);
            particle.fillCircle(0, 0, 4 + Math.random() * 3);
            particle.generateTexture('door-particle-' + i + '-' + Date.now(), 10, 10);
            particle.destroy();

            const particleSprite = this.add.sprite(x, y, 'door-particle-' + i + '-' + Date.now());

            this.tweens.add({
                targets: particleSprite,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed - 30,
                alpha: 0,
                scale: 0.2,
                duration: 800 + Math.random() * 400,
                ease: 'Cubic.easeOut',
                onComplete: () => particleSprite.destroy()
            });
        }
    }

    gameOver() {
        this.gameState = 'ended';

        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.destroy();
        }

        // Freeze physics
        this.physics.pause();

        // Show game over message
        const gameOverText = this.add.text(
            this.cameras.main.centerX + this.cameras.main.scrollX,
            this.cameras.main.centerY + this.cameras.main.scrollY,
            'TIME\'S UP!\nGAME OVER',
            {
                fontSize: '64px',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6,
                fontWeight: 'bold',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Go back to instructions after delay
        this.time.delayedCall(3000, () => {
            this.scene.start('InstructionsScene');
        });
    }

    completeLevel() {
        this.gameState = 'ended';

        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.destroy();
        }

        // Freeze physics
        this.physics.pause();

        // Show completion message
        const completionText = this.add.text(
            this.cameras.main.centerX + this.cameras.main.scrollX,
            this.cameras.main.centerY + this.cameras.main.scrollY,
            `LEVEL ${this.currentLevel} COMPLETE!`,
            {
                fontSize: '64px',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 6,
                fontWeight: 'bold'
            }
        ).setOrigin(0.5);

        // Show hamburgers collected count
        if (GameState.levelHamburgers > 0) {
            this.add.text(
                this.cameras.main.centerX + this.cameras.main.scrollX,
                this.cameras.main.centerY + this.cameras.main.scrollY + 80,
                `🍔 Hamburgers: ${GameState.levelHamburgers}`,
                {
                    fontSize: '36px',
                    fill: '#ffd700',
                    stroke: '#000000',
                    strokeThickness: 4,
                    fontWeight: 'bold'
                }
            ).setOrigin(0.5);
        }

        // Check if there are more levels
        if (this.currentLevel < GameState.totalLevels) {
            // Go to next level with 30s base bonus
            this.time.delayedCall(2000, () => {
                this.scene.start('GameScene', {
                    level: this.currentLevel + 1,
                    timeBonus: 30
                });
            });
        } else {
            // Game complete - go to results
            this.time.delayedCall(2000, () => {
                // Final score = burgers × 10 + seconds × 5
                const finalScore = (GameState.totalHamburgers * 10) + (GameState.currentTime * 5);

                const gameData = {
                    finalScore: finalScore,
                    timeRemaining: GameState.currentTime,
                    totalJumps: GameState.totalJumps,
                    totalCrowCollisions: GameState.totalCrowCollisions,
                    totalHamburgers: GameState.totalHamburgers,
                    completionStatus: 'completed',
                    totalElapsedTime: (Date.now() - GameState.startTimestamp) / 1000,
                    levelsCompleted: GameState.totalLevels,
                    timestamp: new Date().toISOString()
                };

                this.saveGameData(gameData);
                this.scene.start('ResultsScene', gameData);
            });
        }
    }

    async saveGameData(gameData) {
        try {
            await updateDatabase(gameData, '2d-psychometry');
        } catch (error) {
            console.error('Failed to save game data:', error);
        }
    }
}

// Results Scene
class ResultsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultsScene' });
    }

    init(data) {
        this.gameData = data;
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#87CEEB');

        // Title
        this.add.text(W * 0.5, H * 0.15, 'ALL LEVELS COMPLETE!', {
            fontSize: '64px',
            fill: '#00ff00',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Show final score prominently
        this.add.text(W * 0.5, H * 0.28, `FINAL SCORE: ${Math.round(this.gameData.finalScore)}`, {
            fontSize: '56px',
            fill: '#ffd700',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.35, `(${this.gameData.totalHamburgers || 0} burgers × ${this.gameData.timeRemaining.toFixed(1)}s)`, {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Results display
        const results = [
            `Time Remaining: ${this.gameData.timeRemaining.toFixed(1)} seconds`,
            `🍔 Hamburgers Collected: ${this.gameData.totalHamburgers || 0}`,
            `Total Jumps: ${this.gameData.totalJumps}`,
            `Total Crow Collisions: ${this.gameData.totalCrowCollisions}`,
            `Levels Completed: ${this.gameData.levelsCompleted}`,
            `Real Time: ${this.gameData.totalElapsedTime.toFixed(1)}s`,
        ];

        let y = H * 0.45;
        results.forEach(text => {
            this.add.text(W * 0.5, y, text, {
                fontSize: '36px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            y += 60;
        });

        // Instructions
        this.add.text(W * 0.5, H * 0.8,
            'Press SPACE to see highscores or R to restart',
            {
                fontSize: '28px',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);

        // Input handlers
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.rKey = this.input.keyboard.addKey('R');

        this.spaceKey.on('down', () => {
            this.showHighscores();
        });

        this.rKey.on('down', () => {
            this.scene.start('InstructionsScene');
        });
    }

    async showHighscores() {
        try {
            const scores = await getHighscores(
                '2d-psychometry',
                'experiment_payload->finalScore',
                false,  // descending order (higher score is better)
                (query) => query.limit(10)
            );

            this.children.each(child => child.destroy());

            const W = this.sys.game.config.width;
            const H = this.sys.game.config.height;

            // Title
            this.add.text(W * 0.5, 80, 'HIGH SCORES', {
                fontSize: '56px',
                fill: '#ffffff',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            // Headers - left-aligned for Player to prevent obstruction
            this.add.text(W * 0.1, 150, 'Player', {
                fontSize: '32px',
                fill: '#ffff00',
                fontWeight: 'bold'
            }).setOrigin(0, 0.5);

            this.add.text(W * 0.55, 150, 'Score', {
                fontSize: '32px',
                fill: '#ffff00',
                fontWeight: 'bold'
            }).setOrigin(0.5);

            this.add.text(W * 0.75, 150, '🍔', {
                fontSize: '32px',
                fill: '#ffff00',
                fontWeight: 'bold'
            }).setOrigin(0.5);

            this.add.text(W * 0.9, 150, 'Time', {
                fontSize: '32px',
                fill: '#ffff00',
                fontWeight: 'bold'
            }).setOrigin(0.5);

            // Display scores
            let y = 220;
            scores.slice(0, 10).forEach((score, index) => {
                const payload = score.experiment_payload;
                let playerName = score.nickname || 'Anonymous';
                const finalScore = payload.finalScore || 0;
                const burgers = payload.totalHamburgers || 0;
                const timeRemaining = payload.timeRemaining || 0;

                // Truncate long player names to prevent obstruction (max 15 chars)
                if (playerName.length > 15) {
                    playerName = playerName.substring(0, 12) + '...';
                }

                // Left-aligned player name to prevent overlap
                this.add.text(W * 0.1, y, `${index + 1}. ${playerName}`, {
                    fontSize: '28px',
                    fill: '#ffffff'
                }).setOrigin(0, 0.5);

                // Score, burgers, time
                this.add.text(W * 0.55, y, Math.round(finalScore), {
                    fontSize: '28px',
                    fill: '#ffd700',
                    fontWeight: 'bold'
                }).setOrigin(0.5);

                this.add.text(W * 0.75, y, burgers, {
                    fontSize: '28px',
                    fill: '#ffffff'
                }).setOrigin(0.5);

                this.add.text(W * 0.9, y, `${timeRemaining.toFixed(1)}s`, {
                    fontSize: '24px',
                    fill: '#ffffff'
                }).setOrigin(0.5);

                y += 50;
            });

            // Instructions
            this.add.text(W * 0.5, H - 80,
                'Press R to restart',
                {
                    fontSize: '28px',
                    fill: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5);

        } catch (error) {
            console.error('Failed to load highscores:', error);
            const W = this.sys.game.config.width;
            const H = this.sys.game.config.height;
            this.add.text(W * 0.5, H * 0.5,
                'Failed to load highscores',
                {
                    fontSize: '32px',
                    fill: '#ff0000'
                }
            ).setOrigin(0.5);
        }
    }
}

// Initialize game
const baseConfig = PsyExpBaseConfig([InstructionsScene, InstructionsScene2, GameScene, ResultsScene]);
const config = {
    ...baseConfig,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
