// game.js - Diving Risk Measurement
// A 2D platform diving game / psychological experiment measuring risk assessment (BART-like)
import {
    font,
    nickname,
    PsyExpBaseConfig,
    fetchMessages,
    updateDatabase,
    getHighscores,
    getCookie,
} from '../../psyexp_core.js';

const required = [Phaser];
let messageMap = {};
try {
    const activeLang = getCookie('language') || 'en-us';
    messageMap = await fetchMessages(activeLang, "diving-risk") || {};
} catch (e) {
    console.warn('Could not fetch messages, using defaults:', e);
}

// Seeded PRNG (mulberry32)
function seededRandom(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Constants ──
const OXYGEN_PER_TRIP = 30;       // seconds
const LEVEL_TIME = 90;            // 1m30s global countdown per level
const WORLD_WIDTH = 3840;
const WORLD_HEIGHT = 2400;
const SURFACE_Y = 300;            // water surface line
const TILE = 48;

// Level configs: depth of water, egg count, hazard count, current strength
// Egg counts are high enough that it's impossible to retrieve them all in the allotted time,
// forcing the player to make strategic risk/reward decisions (BART-like).
const LevelConfigs = {
    1: { eggs: 30, jellyfish: 6,  maxDepth: 1600, currentStrength: 0,   eggMinY: 500,  eggMaxY: 1400 },
    2: { eggs: 40, jellyfish: 12, maxDepth: 2000, currentStrength: 30,  eggMinY: 600,  eggMaxY: 1800 },
    3: { eggs: 55, jellyfish: 20, maxDepth: 2400, currentStrength: 60,  eggMinY: 800,  eggMaxY: 2200 },
};

// Global game state
const GameState = {
    currentLevel: 1,
    totalLevels: 3,
    globalTimer: 0,
    totalEggsCollected: 0,
    totalDives: 0,
    totalJellyfishHits: 0,
    totalOxygenDepletions: 0,
    startTimestamp: null,
    // Per-dive tracking for BART-like analysis
    diveLog: [],           // { diveNumber, depthReached, eggsCollected, oxygenUsed, surfacedSafely }
    eggsThisLevel: 0,
    eggsBanked: 0,         // eggs safely returned to surface
};

// ─────────────────────────────────────────
// Instructions Scene
// ─────────────────────────────────────────
class InstructionsScene extends Phaser.Scene {
    constructor() { super({ key: 'InstructionsScene' }); }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // Reset state
        GameState.currentLevel = 1;
        GameState.globalTimer = LEVEL_TIME;
        GameState.totalEggsCollected = 0;
        GameState.totalDives = 0;
        GameState.totalJellyfishHits = 0;
        GameState.totalOxygenDepletions = 0;
        GameState.diveLog = [];
        GameState.eggsThisLevel = 0;
        GameState.eggsBanked = 0;
        GameState.startTimestamp = Date.now();

        this.cameras.main.setBackgroundColor('#001830');

        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 0.75);
        gfx.fillRect(0, 0, W, H);

        this.add.text(W * 0.5, H * 0.08, 'DIVING RISK MEASUREMENT', {
            fontSize: '56px', fill: '#00ccff', fontWeight: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        const txt =
            "You are a deep-sea diver searching for rare dinosaur eggs!\n\n" +
            "RULES:\n" +
            "  - Your scuba tank holds 30 seconds of oxygen per dive.\n" +
            "  - Each level has a 1m30s countdown. When it hits 0 the level ends.\n" +
            "  - Collect eggs underwater and RETURN TO THE SURFACE to bank them.\n" +
            "  - If your oxygen runs out underwater, you black out and\n" +
            "    lose all UN-BANKED eggs from that dive, plus a time penalty.\n" +
            "  - Deeper eggs are worth more points, but the risk is greater.\n\n" +
            "CONTROLS:\n" +
            "  - Arrow keys / WASD to swim\n" +
            "  - Movement is slower the deeper you go\n" +
            "  - SPACE to jump (on surface only)\n\n" +
            "SCORING:\n" +
            "  - Banked eggs x depth-bonus + remaining time x 5\n" +
            "  - 3 levels of increasing difficulty\n\n" +
            "The deeper you go, the bigger the reward... and the bigger the risk.";

        this.add.text(W * 0.5, H * 0.52, txt, {
            fontSize: '24px', fill: '#ffffff',
            wordWrap: { width: W - 200 }, align: 'center', lineSpacing: 6
        }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.92, 'Press SPACE or CLICK to start', {
            fontSize: '30px', fill: '#ffff00', fontWeight: 'bold',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        this.input.keyboard.addKey('SPACE').on('down', () => this.scene.start('GameScene', { level: 1 }));
        this.input.on('pointerdown', () => this.scene.start('GameScene', { level: 1 }));
    }
}

// ─────────────────────────────────────────
// Game Scene
// ─────────────────────────────────────────
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    init(data) {
        this.currentLevel = data.level || 1;
        this.levelConfig = LevelConfigs[this.currentLevel];
        this.oxygen = OXYGEN_PER_TRIP;
        this.isUnderwater = false;
        this.gameState = 'playing';
        this.divingNow = false;
        this.currentDiveEggs = 0;
        this.currentDiveMaxDepth = 0;
        this.diveStartTime = 0;
        GameState.eggsThisLevel = 0;
    }

    preload() {
        this.createDiverSprites();
        this.createEggSprite();
        this.createJellyfishSprite();
        this.createTerrainTiles();
        this.createBubbleSprite();
    }

    // ── Procedural sprites ──

    createDiverSprites() {
        // Idle frames (4)
        for (let f = 0; f < 4; f++) {
            const g = this.add.graphics();
            const bob = Math.sin(f * Math.PI / 2) * 1;

            // Wetsuit body (dark blue)
            g.fillStyle(0x1a2a4a, 1);
            g.fillRect(18, 24 + bob, 28, 32);

            // Head
            g.fillStyle(0xffdbac, 1);
            g.fillCircle(32, 16, 12);

            // Diving mask (teal)
            g.fillStyle(0x00aacc, 0.7);
            g.fillRect(26, 10, 14, 10);
            g.lineStyle(2, 0x333333);
            g.strokeRect(26, 10, 14, 10);

            // Eye through mask
            g.fillStyle(0xffffff, 1);
            g.fillCircle(33, 15, 3);
            g.fillStyle(0x000000, 1);
            g.fillCircle(34, 15, 1.5);

            // Scuba tank (gray cylinder on back)
            g.fillStyle(0x888888, 1);
            g.fillRect(14, 20 + bob, 8, 28);
            g.fillStyle(0xaaaaaa, 1);
            g.fillRect(15, 18 + bob, 6, 4);

            // Hose from tank to mask
            g.lineStyle(2, 0x555555);
            g.lineBetween(18, 22 + bob, 26, 16);

            // Flippers
            g.fillStyle(0x00cc66, 1);
            g.fillRect(20, 56 + bob, 12, 6);
            g.fillRect(30, 56 + bob, 12, 6);

            // Fins extension
            g.fillStyle(0x00aa55, 1);
            g.fillRect(16, 60 + bob, 10, 3);
            g.fillRect(34, 60 + bob, 10, 3);

            g.generateTexture(`diver-idle-${f}`, 64, 64);
            g.destroy();
        }

        // Swim frames (6) - legs kick
        for (let f = 0; f < 6; f++) {
            const g = this.add.graphics();
            const kick = Math.sin(f * Math.PI / 3) * 6;

            // Wetsuit body
            g.fillStyle(0x1a2a4a, 1);
            g.fillRect(18, 24, 28, 32);

            // Head
            g.fillStyle(0xffdbac, 1);
            g.fillCircle(32, 16, 12);

            // Diving mask
            g.fillStyle(0x00aacc, 0.7);
            g.fillRect(26, 10, 14, 10);
            g.lineStyle(2, 0x333333);
            g.strokeRect(26, 10, 14, 10);

            // Eye
            g.fillStyle(0xffffff, 1);
            g.fillCircle(33, 15, 3);
            g.fillStyle(0x000000, 1);
            g.fillCircle(34, 15, 1.5);

            // Scuba tank
            g.fillStyle(0x888888, 1);
            g.fillRect(14, 20, 8, 28);
            g.fillStyle(0xaaaaaa, 1);
            g.fillRect(15, 18, 6, 4);

            // Hose
            g.lineStyle(2, 0x555555);
            g.lineBetween(18, 22, 26, 16);

            // Arms - swimming motion
            const armSwing = Math.sin(f * Math.PI / 3) * 8;
            g.fillStyle(0x1a2a4a, 1);
            g.fillRect(40, 30 + armSwing, 12, 5);

            // Kicking flippers
            g.fillStyle(0x00cc66, 1);
            g.fillRect(20 + kick, 56, 12, 6);
            g.fillRect(30 - kick, 56, 12, 6);

            g.fillStyle(0x00aa55, 1);
            g.fillRect(16 + kick, 60, 10, 3);
            g.fillRect(34 - kick, 60, 10, 3);

            g.generateTexture(`diver-swim-${f}`, 64, 64);
            g.destroy();
        }
    }

    createEggSprite() {
        const g = this.add.graphics();

        // Egg shape (oval) - speckled green/brown
        g.fillStyle(0x8b7d3c, 1);
        g.fillEllipse(20, 22, 28, 36);

        // Speckles
        g.fillStyle(0x6b5d2c, 1);
        g.fillCircle(14, 15, 3);
        g.fillCircle(24, 12, 2);
        g.fillCircle(18, 28, 2.5);
        g.fillCircle(26, 22, 2);
        g.fillCircle(12, 24, 1.5);

        // Highlight
        g.fillStyle(0xb0a060, 0.5);
        g.fillCircle(16, 16, 5);

        g.generateTexture('dino-egg', 40, 44);
        g.destroy();

        // "Deep" egg variant (more valuable, glowing)
        const g2 = this.add.graphics();
        g2.fillStyle(0xcc9933, 1);
        g2.fillEllipse(20, 22, 28, 36);
        g2.fillStyle(0xffcc00, 0.3);
        g2.fillEllipse(20, 22, 34, 42); // glow
        g2.fillStyle(0xaa8822, 1);
        g2.fillCircle(14, 15, 3);
        g2.fillCircle(24, 12, 2);
        g2.fillCircle(18, 28, 2.5);
        g2.fillStyle(0xeedd88, 0.5);
        g2.fillCircle(16, 16, 5);
        g2.generateTexture('dino-egg-rare', 40, 44);
        g2.destroy();
    }

    createJellyfishSprite() {
        for (let f = 0; f < 4; f++) {
            const g = this.add.graphics();
            const pulse = Math.sin(f * Math.PI / 2) * 3;

            // Bell (dome)
            g.fillStyle(0xff66cc, 0.6);
            g.fillEllipse(24, 14, 36 + pulse, 24 - pulse);

            // Inner glow
            g.fillStyle(0xff99dd, 0.4);
            g.fillEllipse(24, 12, 20 + pulse, 14 - pulse);

            // Tentacles
            g.lineStyle(2, 0xff66cc, 0.7);
            for (let t = 0; t < 5; t++) {
                const tx = 10 + t * 7;
                const wave = Math.sin((f + t) * Math.PI / 2) * 4;
                g.lineBetween(tx, 24, tx + wave, 44);
            }

            g.generateTexture(`jellyfish-${f}`, 48, 48);
            g.destroy();
        }
    }

    createTerrainTiles() {
        // Seabed rock
        const g1 = this.add.graphics();
        g1.fillStyle(0x3a3a2a, 1);
        g1.fillRect(0, 0, TILE, TILE);
        g1.fillStyle(0x4a4a3a, 1);
        g1.fillRect(2, 2, 20, 12);
        g1.fillRect(26, 18, 18, 14);
        g1.lineStyle(1, 0x2a2a1a);
        g1.strokeRect(0, 0, TILE, TILE);
        g1.generateTexture('rock-tile', TILE, TILE);
        g1.destroy();

        // Sand tile (surface)
        const g2 = this.add.graphics();
        g2.fillStyle(0xc2b280, 1);
        g2.fillRect(0, 0, TILE, TILE);
        g2.fillStyle(0xd4c490, 1);
        g2.fillRect(4, 4, 14, 8);
        g2.fillRect(28, 20, 12, 10);
        g2.generateTexture('sand-tile', TILE, TILE);
        g2.destroy();

        // Wooden floating-platform tile
        const g4 = this.add.graphics();
        g4.fillStyle(0x8b6914, 1);
        g4.fillRect(0, 0, TILE, TILE / 2);
        g4.fillStyle(0xa07828, 1);
        g4.fillRect(2, 2, TILE - 4, TILE / 2 - 6);
        g4.lineStyle(1, 0x6b4e0a);
        g4.lineBetween(0, TILE / 4, TILE, TILE / 4);
        g4.strokeRect(0, 0, TILE, TILE / 2);
        g4.generateTexture('wood-tile', TILE, TILE / 2);
        g4.destroy();

        // Coral decoration
        const g3 = this.add.graphics();
        g3.fillStyle(0xff6666, 1);
        g3.fillRect(8, 16, 6, 32);
        g3.fillCircle(11, 12, 8);
        g3.fillStyle(0xff9999, 1);
        g3.fillCircle(11, 12, 4);
        g3.fillStyle(0xff4444, 1);
        g3.fillRect(20, 24, 5, 24);
        g3.fillCircle(22, 20, 6);
        g3.generateTexture('coral', TILE, TILE);
        g3.destroy();
    }

    createBubbleSprite() {
        const g = this.add.graphics();
        g.fillStyle(0xaaddff, 0.5);
        g.fillCircle(6, 6, 6);
        g.lineStyle(1, 0xcceeFF, 0.8);
        g.strokeCircle(6, 6, 6);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(4, 4, 2);
        g.generateTexture('bubble', 12, 12);
        g.destroy();

        // Shared particle texture (reused for egg/jellyfish effects)
        const p = this.add.graphics();
        p.fillStyle(0xffcc33, 1);
        p.fillCircle(3, 3, 3);
        p.generateTexture('particle-yellow', 6, 6);
        p.destroy();
    }

    // ── Create ──

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.gameState = 'playing';
        this.oxygen = OXYGEN_PER_TRIP;
        this.divingNow = false;
        this.currentDiveEggs = 0;
        this.currentDiveMaxDepth = 0;
        this.diveNumber = GameState.totalDives;
        this.blackedOut = false;
        this.activeBubbleCount = 0;
        this.activePlayerBubbleCount = 0;

        // If first level, set global timer; otherwise keep it
        if (this.currentLevel === 1) {
            GameState.globalTimer = LEVEL_TIME;
        }

        // Set world bounds (tall world, mostly underwater)
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Background layers
        this.createBackground();

        // Animations
        this.createAnimations();

        // Terrain
        this.createTerrain();

        // Eggs
        this.spawnEggs();

        // Jellyfish
        this.spawnJellyfish();

        // Player
        this.createPlayer();

        // Camera
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(200, 100);

        // Collisions
        this.setupCollisions();

        // Input
        this.setupInput();

        // UI (fixed to camera)
        this.createUI();

        // Timers
        this.startTimers();

        // Scheduled low-frequency updates (spec: avoid heavy work in update())
        // UI text updates at 10Hz — no visual difference, big perf win
        this.uiTimer = this.time.addEvent({
            delay: 100,
            callback: () => this.updateUI(),
            loop: true,
        });

        // Jellyfish AI at 10Hz
        this.jellyfishTimer = this.time.addEvent({
            delay: 100,
            callback: () => this.updateJellyfish(),
            loop: true,
        });

        // Bubble emitters via time.delayedCall
        this.bubbleTimer = this.time.addEvent({
            delay: 400,
            callback: () => this.spawnAmbientBubble(),
            loop: true,
        });

        this.playerBubbleTimer = this.time.addEvent({
            delay: 200,
            callback: () => { if (this.isUnderwater) this.spawnPlayerBubble(); },
            loop: true,
        });

        // Level start text
        this.showLevelStart();
    }

    createBackground() {
        // Sky gradient (above water)
        const skyGfx = this.add.graphics();
        skyGfx.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x4a90c2, 0x4a90c2, 1);
        skyGfx.fillRect(0, 0, WORLD_WIDTH, SURFACE_Y);

        // Water body gradient (gets darker with depth)
        const waterGfx = this.add.graphics();
        // Shallow water
        waterGfx.fillGradientStyle(0x1a6090, 0x1a6090, 0x0a3050, 0x0a3050, 0.85);
        waterGfx.fillRect(0, SURFACE_Y, WORLD_WIDTH, 600);
        // Mid water
        waterGfx.fillGradientStyle(0x0a3050, 0x0a3050, 0x041828, 0x041828, 0.9);
        waterGfx.fillRect(0, SURFACE_Y + 600, WORLD_WIDTH, 600);
        // Deep water
        waterGfx.fillGradientStyle(0x041828, 0x041828, 0x010810, 0x010810, 0.95);
        waterGfx.fillRect(0, SURFACE_Y + 1200, WORLD_WIDTH, WORLD_HEIGHT - SURFACE_Y - 1200);

        // Water surface line (shimmering)
        this.waterLine = this.add.graphics();
        this.waterLine.fillStyle(0x3399cc, 0.6);
        this.waterLine.fillRect(0, SURFACE_Y - 4, WORLD_WIDTH, 8);

        // Sun at top
        const sunGfx = this.add.graphics();
        sunGfx.fillStyle(0xffdd44, 0.8);
        sunGfx.fillCircle(300, 80, 60);
        sunGfx.fillStyle(0xffee88, 0.3);
        sunGfx.fillCircle(300, 80, 90);
    }

    createAnimations() {
        if (!this.anims.exists('diver-idle')) {
            this.anims.create({
                key: 'diver-idle',
                frames: [
                    { key: 'diver-idle-0' }, { key: 'diver-idle-1' },
                    { key: 'diver-idle-2' }, { key: 'diver-idle-3' }
                ],
                frameRate: 6, repeat: -1
            });
        }
        if (!this.anims.exists('diver-swim')) {
            this.anims.create({
                key: 'diver-swim',
                frames: [
                    { key: 'diver-swim-0' }, { key: 'diver-swim-1' },
                    { key: 'diver-swim-2' }, { key: 'diver-swim-3' },
                    { key: 'diver-swim-4' }, { key: 'diver-swim-5' }
                ],
                frameRate: 10, repeat: -1
            });
        }
        if (!this.anims.exists('jellyfish-pulse')) {
            this.anims.create({
                key: 'jellyfish-pulse',
                frames: [
                    { key: 'jellyfish-0' }, { key: 'jellyfish-1' },
                    { key: 'jellyfish-2' }, { key: 'jellyfish-3' }
                ],
                frameRate: 4, repeat: -1
            });
        }
    }

    createTerrain() {
        this.ground = this.physics.add.staticGroup();
        const rng = seededRandom(this.currentLevel * 7919);

        // Sea floor at the bottom
        const floorY = WORLD_HEIGHT - TILE;
        for (let x = 0; x < WORLD_WIDTH; x += TILE) {
            this.ground.create(x + TILE / 2, floorY + TILE / 2, 'rock-tile');
        }

        // Rocky outcrops and shelves at various depths (seeded)
        const shelfCount = 6 + this.currentLevel * 4;
        for (let i = 0; i < shelfCount; i++) {
            const sx = Math.floor(rng() * (WORLD_WIDTH - 400)) + 200;
            const sy = SURFACE_Y + 200 + Math.floor(rng() * (WORLD_HEIGHT - SURFACE_Y - 400));
            const sw = 2 + Math.floor(rng() * 4); // 2-5 tiles wide

            for (let t = 0; t < sw; t++) {
                this.ground.create(sx + t * TILE + TILE / 2, sy + TILE / 2, 'rock-tile');
            }

            // Chance of coral on shelf
            if (rng() > 0.5) {
                this.add.sprite(sx + TILE / 2, sy - TILE / 2 + 8, 'coral').setAlpha(0.8);
            }
        }

        // Surface platform (beach/dock) on the left
        for (let x = 0; x < 480; x += TILE) {
            this.ground.create(x + TILE / 2, SURFACE_Y + TILE / 2, 'sand-tile');
            this.ground.create(x + TILE / 2, SURFACE_Y + TILE * 1.5, 'sand-tile');
        }

        // Floating wooden platforms above water for quick horizontal navigation (spec line 16)
        // Seeded positions so they're consistent across plays
        const platRng = seededRandom(this.currentLevel * 4271);
        const floatingCount = 5 + this.currentLevel * 2; // 7, 9, 11 per level
        for (let i = 0; i < floatingCount; i++) {
            const px = 500 + Math.floor(platRng() * (WORLD_WIDTH - 700));
            const py = SURFACE_Y - 40 - Math.floor(platRng() * 120); // 40-160px above water
            const pw = 2 + Math.floor(platRng() * 3); // 2-4 tiles wide

            for (let t = 0; t < pw; t++) {
                const tile = this.ground.create(px + t * TILE + TILE / 2, py + TILE / 4, 'wood-tile');
                tile.setScale(1).refreshBody();
                tile.body.setSize(TILE, TILE / 2);
            }
        }
    }

    spawnEggs() {
        this.eggGroup = this.physics.add.group();
        const rng = seededRandom(this.currentLevel * 3571);
        const cfg = this.levelConfig;

        for (let i = 0; i < cfg.eggs; i++) {
            const ex = 200 + Math.floor(rng() * (WORLD_WIDTH - 400));
            const ey = cfg.eggMinY + Math.floor(rng() * (cfg.eggMaxY - cfg.eggMinY));

            // Deeper eggs use rare texture
            const isRare = ey > (cfg.eggMinY + cfg.eggMaxY) / 2;
            const texture = isRare ? 'dino-egg-rare' : 'dino-egg';

            const egg = this.eggGroup.create(ex, ey, texture);
            egg.body.allowGravity = false;
            egg.setData('depth', ey);
            egg.setData('points', Math.floor((ey - SURFACE_Y) / 50)); // deeper = more points

            // Gentle bob
            this.tweens.add({
                targets: egg,
                y: ey - 8,
                yoyo: true, repeat: -1,
                duration: 1500 + Math.floor(rng() * 800),
                ease: 'Sine.easeInOut'
            });
        }
    }

    spawnJellyfish() {
        this.jellyfishGroup = this.physics.add.group();
        const rng = seededRandom(this.currentLevel * 6131);
        const cfg = this.levelConfig;

        for (let i = 0; i < cfg.jellyfish; i++) {
            const jx = 300 + Math.floor(rng() * (WORLD_WIDTH - 600));
            const jy = SURFACE_Y + 150 + Math.floor(rng() * (WORLD_HEIGHT - SURFACE_Y - 400));

            const jf = this.jellyfishGroup.create(jx, jy, 'jellyfish-0');
            jf.body.allowGravity = false;
            jf.setData('startX', jx);
            jf.setData('startY', jy);
            jf.setData('speed', 15 + Math.floor(rng() * 25));
            jf.setData('direction', rng() > 0.5 ? 1 : -1);
            jf.setData('patrolDist', 80 + Math.floor(rng() * 120));
            jf.setData('hitRecently', false);
            jf.play('jellyfish-pulse');
        }
    }

    createPlayer() {
        // Start on the beach
        this.player = this.physics.add.sprite(200, SURFACE_Y - 40, 'diver-idle-0');
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0);
        this.player.body.setSize(40, 56);
        this.player.body.setOffset(12, 6);
        this.player.play('diver-idle');
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.ground);

        this.physics.add.overlap(this.player, this.eggGroup, this.collectEgg, null, this);
        this.physics.add.overlap(this.player, this.jellyfishGroup, this.hitJellyfish, null, this);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.keyS = this.input.keyboard.addKey('S');
        this.spaceKey = this.input.keyboard.addKey('SPACE');

        // Touch controls
        this.touchState = { left: false, right: false, up: false, down: false };

        this.input.on('pointerdown', (p) => this.handleTouch(p, true));
        this.input.on('pointerup', (p) => this.handleTouch(p, false));
        this.input.on('pointermove', (p) => { if (p.isDown) this.handleTouch(p, true); });
    }

    handleTouch(pointer, isDown) {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;
        const cx = W / 2, cy = H / 2;

        const aboveLeft = (pointer.y - cy) < (pointer.x - cx);
        const aboveRight = (pointer.y - cy) < -(pointer.x - cx);

        if (!isDown) {
            this.touchState = { left: false, right: false, up: false, down: false };
            return;
        }

        if (aboveLeft && aboveRight) {
            this.touchState.up = true; this.touchState.down = false;
        } else if (aboveLeft && !aboveRight) {
            this.touchState.right = true; this.touchState.left = false;
        } else if (!aboveLeft && aboveRight) {
            this.touchState.left = true; this.touchState.right = false;
        } else {
            this.touchState.down = true; this.touchState.up = false;
        }
    }

    createUI() {
        const W = this.sys.game.config.width;

        // Level text
        this.levelText = this.add.text(30, 20, `LEVEL ${this.currentLevel}/3`, {
            fontSize: '30px', fill: '#fff', stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0);

        // Global timer
        this.timerText = this.add.text(W * 0.5, 30, `Time: ${GameState.globalTimer.toFixed(1)}s`, {
            fontSize: '42px', fill: '#fff', stroke: '#000', strokeThickness: 4, fontWeight: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        // Oxygen bar background
        this.oxygenBarBg = this.add.graphics().setScrollFactor(0);
        this.oxygenBarBg.fillStyle(0x000000, 0.5);
        this.oxygenBarBg.fillRect(30, 65, 304, 28);

        // Oxygen bar fill
        this.oxygenBarFill = this.add.graphics().setScrollFactor(0);

        // Oxygen text (created once, updated via setText)
        this.oxygenText = this.add.text(182, 79, '', {
            fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);

        // Oxygen label
        this.oxygenLabel = this.add.text(30, 48, 'O2', {
            fontSize: '16px', fill: '#00ccff', stroke: '#000', strokeThickness: 2
        }).setScrollFactor(0);

        // Eggs collected this dive
        this.diveEggsText = this.add.text(30, 100, 'Dive eggs: 0', {
            fontSize: '24px', fill: '#ffcc33', stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0);

        // Banked eggs
        this.bankedText = this.add.text(30, 130, `Banked: ${GameState.eggsBanked}`, {
            fontSize: '24px', fill: '#00ff88', stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0);

        // FPS counter (top right corner)
        this.fpsText = this.add.text(W - 30, 20, 'FPS: 60', {
            fontSize: '22px', fill: '#ffff00', stroke: '#000', strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0);

        // Depth indicator (right side)
        this.depthText = this.add.text(W - 30, 48, 'Depth: 0m', {
            fontSize: '28px', fill: '#aaddff', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0);

        // Dive count
        this.diveCountText = this.add.text(W - 30, 82, `Dives: ${GameState.totalDives}`, {
            fontSize: '22px', fill: '#aaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0);

        // Score
        this.scoreText = this.add.text(W * 0.5, 75, 'Score: 0', {
            fontSize: '30px', fill: '#ffd700', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0);

        // Hint
        this.add.text(W * 0.5, this.sys.game.config.height - 25, 'Surface to bank eggs | Deeper = more points + more risk', {
            fontSize: '18px', fill: '#888', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
    }

    startTimers() {
        // Anchor timers to real wall-clock time via performance.now(),
        // so they are independent of FPS fluctuations (spec line 23).
        this._lastTimerTick = performance.now();
        this._timerActive = true;
    }

    tickTimers() {
        if (!this._timerActive || this.gameState !== 'playing') return;

        const now = performance.now();
        const dt = (now - this._lastTimerTick) / 1000; // seconds elapsed
        this._lastTimerTick = now;

        // Global countdown
        GameState.globalTimer -= dt;
        if (GameState.globalTimer <= 0) {
            GameState.globalTimer = 0;
            this.endLevel();
            return;
        }

        // Oxygen countdown (only while underwater)
        if (this.isUnderwater) {
            this.oxygen -= dt;
            if (this.oxygen <= 0) {
                this.oxygen = 0;
                this.oxygenDepleted();
            }
        }
    }

    showLevelStart() {
        const W = this.sys.game.config.width;
        const txt = this.add.text(W * 0.5, this.sys.game.config.height * 0.4,
            `LEVEL ${this.currentLevel}`, {
                fontSize: '72px', fill: '#00ccff', fontWeight: 'bold',
                stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: txt,
            alpha: 0, y: txt.y - 80,
            duration: 2000, ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });
    }

    // ── Update ──

    update() {
        if (this.gameState !== 'playing') return;

        // Tick real-time anchored timers
        this.tickTimers();
        if (this.gameState !== 'playing') return; // endLevel may have fired

        const playerY = this.player.y;
        const wasUnderwater = this.isUnderwater;
        this.isUnderwater = playerY > SURFACE_Y + 20;

        // Detect surface return (banking eggs)
        if (wasUnderwater && !this.isUnderwater && this.divingNow) {
            this.bankEggs();
        }

        // Detect entering water
        if (!wasUnderwater && this.isUnderwater && !this.divingNow) {
            this.startDive();
        }

        // Track dive depth
        if (this.isUnderwater && playerY > this.currentDiveMaxDepth) {
            this.currentDiveMaxDepth = playerY;
        }

        // Movement (must be per-frame for responsive input)
        if (!this.blackedOut) {
            this.updateMovement();
        }

        // Underwater physics (must be per-frame for smooth simulation)
        if (this.isUnderwater) {
            // Apply drag (water resistance)
            this.player.body.velocity.x *= 0.97;
            this.player.body.velocity.y *= 0.97;

            // Buoyancy: slight upward force near surface, none at depth
            const depthRatio = Math.min(1, (playerY - SURFACE_Y) / 800);
            const buoyancy = (1 - depthRatio) * -15;
            this.player.body.velocity.y += buoyancy;

            // Underwater currents (levels 2+)
            if (this.levelConfig.currentStrength > 0) {
                const currentDir = Math.sin(this.time.now / 3000 + playerY / 200);
                this.player.body.velocity.x += currentDir * this.levelConfig.currentStrength * 0.05;
            }
        }
    }

    updateMovement() {
        const left = this.cursors.left.isDown || this.keyA.isDown || this.touchState.left;
        const right = this.cursors.right.isDown || this.keyD.isDown || this.touchState.right;
        const up = this.cursors.up.isDown || this.keyW.isDown || this.touchState.up;
        const down = this.cursors.down.isDown || this.keyS.isDown || this.touchState.down;
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        if (this.isUnderwater) {
            // Swimming - depth affects speed (deeper = slower)
            const depthFactor = Math.max(0.5, 1 - (this.player.y - SURFACE_Y) / 3000);
            const swimSpeed = 220 * depthFactor;

            if (left) { this.player.setVelocityX(-swimSpeed); this.player.flipX = true; }
            else if (right) { this.player.setVelocityX(swimSpeed); this.player.flipX = false; }

            if (up) { this.player.setVelocityY(-swimSpeed); }
            else if (down) { this.player.setVelocityY(swimSpeed * 0.8); }

            // Reduced gravity underwater
            this.player.body.gravity.y = -700; // counteract most of world gravity

            // Swimming animation
            if (Math.abs(this.player.body.velocity.x) > 10 || Math.abs(this.player.body.velocity.y) > 10) {
                if (this.player.anims.currentAnim?.key !== 'diver-swim') {
                    this.player.play('diver-swim');
                }
            } else {
                if (this.player.anims.currentAnim?.key !== 'diver-idle') {
                    this.player.play('diver-idle');
                }
            }
        } else {
            // On surface - normal platformer movement
            this.player.body.gravity.y = 0; // use world gravity
            const walkSpeed = 250;

            if (left) { this.player.setVelocityX(-walkSpeed); this.player.flipX = true; }
            else if (right) { this.player.setVelocityX(walkSpeed); this.player.flipX = false; }
            else { this.player.setVelocityX(0); }

            // Jump
            const jumpPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
                Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                Phaser.Input.Keyboard.JustDown(this.keyW);

            if (jumpPressed && onGround) {
                this.player.setVelocityY(-450);
            }

            // Surface animations
            if (onGround && Math.abs(this.player.body.velocity.x) > 10) {
                if (this.player.anims.currentAnim?.key !== 'diver-swim') {
                    this.player.play('diver-swim'); // reuse swim as walk
                }
            } else if (onGround) {
                if (this.player.anims.currentAnim?.key !== 'diver-idle') {
                    this.player.play('diver-idle');
                }
            }
        }
    }

    updateJellyfish() {
        if (this.gameState !== 'playing') return;
        const now = this.time.now;
        this.jellyfishGroup.children.entries.forEach(jf => {
            const speed = jf.getData('speed');
            const startX = jf.getData('startX');
            const startY = jf.getData('startY');
            let dir = jf.getData('direction');
            const patrol = jf.getData('patrolDist');

            const dist = jf.x - startX;
            if (Math.abs(dist) > patrol) {
                dir = -dir;
                jf.setData('direction', dir);
            }

            jf.setVelocityX(speed * dir);

            // Gentle vertical bob
            const vertBob = Math.sin(now / 2000 + startX) * 8;
            jf.setVelocityY(vertBob);
        });
    }

    updateUI() {
        if (this.gameState !== 'playing') return;
        const W = this.sys.game.config.width;

        // Timer
        this.timerText.setText(`Time: ${GameState.globalTimer.toFixed(1)}s`);
        this.timerText.setFill(GameState.globalTimer < 15 ? '#ff4444' : '#ffffff');

        // Oxygen bar
        this.oxygenBarFill.clear();
        const oxyPercent = this.oxygen / OXYGEN_PER_TRIP;
        const barColor = oxyPercent > 0.5 ? 0x00ccff : oxyPercent > 0.2 ? 0xffaa00 : 0xff3333;
        this.oxygenBarFill.fillStyle(barColor, 1);
        this.oxygenBarFill.fillRect(32, 67, 300 * oxyPercent, 24);

        // Oxygen text on bar
        this.oxygenText.setText(`${this.oxygen.toFixed(1)}s`);

        // Dive eggs
        this.diveEggsText.setText(`Dive eggs: ${this.currentDiveEggs}`);
        this.diveEggsText.setVisible(this.divingNow);

        // Banked
        this.bankedText.setText(`Banked: ${GameState.eggsBanked}`);

        // Depth
        const depthMeters = Math.max(0, Math.floor((this.player.y - SURFACE_Y) / 10));
        this.depthText.setText(`Depth: ${depthMeters}m`);
        this.depthText.setVisible(this.isUnderwater);

        // Dive count
        this.diveCountText.setText(`Dives: ${GameState.totalDives}`);

        // Score
        const score = this.calculateScore();
        this.scoreText.setText(`Score: ${score}`);

        // FPS
        this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }

    calculateScore() {
        return GameState.eggsBanked * 15 + Math.round(GameState.globalTimer * 5);
    }

    // ── Dive mechanics ──

    startDive() {
        this.divingNow = true;
        this.oxygen = OXYGEN_PER_TRIP;
        this.currentDiveEggs = 0;
        this.currentDiveMaxDepth = this.player.y;
        this.diveStartTime = this.time.now;
        GameState.totalDives++;

        const txt = this.add.text(this.player.x, this.player.y - 40, 'DIVING!', {
            fontSize: '28px', fill: '#00ccff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        this.tweens.add({
            targets: txt, alpha: 0, y: txt.y - 50, duration: 1000,
            onComplete: () => txt.destroy()
        });
    }

    bankEggs() {
        if (this.currentDiveEggs > 0) {
            GameState.eggsBanked += this.currentDiveEggs;
            GameState.totalEggsCollected += this.currentDiveEggs;

            const txt = this.add.text(this.player.x, this.player.y - 50,
                `BANKED ${this.currentDiveEggs} EGGS!`, {
                    fontSize: '32px', fill: '#00ff88', fontWeight: 'bold',
                    stroke: '#000', strokeThickness: 4
                }).setOrigin(0.5);
            this.tweens.add({
                targets: txt, alpha: 0, y: txt.y - 60, duration: 1500,
                onComplete: () => txt.destroy()
            });

            this.cameras.main.flash(200, 0, 255, 136, false);
        }

        // Log dive data for BART analysis
        GameState.diveLog.push({
            diveNumber: this.diveNumber++,
            level: this.currentLevel,
            depthReached: Math.floor((this.currentDiveMaxDepth - SURFACE_Y) / 10),
            eggsCollected: this.currentDiveEggs,
            oxygenUsed: OXYGEN_PER_TRIP - this.oxygen,
            surfacedSafely: true,
            duration: (this.time.now - this.diveStartTime) / 1000,
        });

        this.divingNow = false;
        this.currentDiveEggs = 0;
        this.oxygen = OXYGEN_PER_TRIP;
    }

    oxygenDepleted() {
        if (this.blackedOut) return;
        this.blackedOut = true;
        GameState.totalOxygenDepletions++;

        // Lose un-banked eggs from this dive
        const lostEggs = this.currentDiveEggs;

        // Log failed dive
        GameState.diveLog.push({
            diveNumber: this.diveNumber++,
            level: this.currentLevel,
            depthReached: Math.floor((this.currentDiveMaxDepth - SURFACE_Y) / 10),
            eggsCollected: this.currentDiveEggs,
            eggsLost: lostEggs,
            oxygenUsed: OXYGEN_PER_TRIP,
            surfacedSafely: false,
            duration: (this.time.now - this.diveStartTime) / 1000,
        });

        this.currentDiveEggs = 0;
        this.divingNow = false;

        // Time penalty
        GameState.globalTimer -= 5;
        if (GameState.globalTimer < 0) GameState.globalTimer = 0;

        // Visual: screen goes dark, then resurface
        this.cameras.main.fade(800, 0, 0, 0, false);

        const blackoutText = this.add.text(
            this.sys.game.config.width * 0.5,
            this.sys.game.config.height * 0.4,
            'OXYGEN DEPLETED!\n-5s penalty',
            {
                fontSize: '48px', fill: '#ff3333', fontWeight: 'bold',
                stroke: '#000', strokeThickness: 5, align: 'center'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        if (lostEggs > 0) {
            const lostText = this.add.text(
                this.sys.game.config.width * 0.5,
                this.sys.game.config.height * 0.55,
                `Lost ${lostEggs} egg${lostEggs > 1 ? 's' : ''}!`,
                {
                    fontSize: '36px', fill: '#ff9900',
                    stroke: '#000', strokeThickness: 4
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

            this.time.delayedCall(1500, () => lostText.destroy());
        }

        // Teleport back to surface after delay
        this.time.delayedCall(1500, () => {
            this.player.setPosition(200, SURFACE_Y - 40);
            this.player.setVelocity(0, 0);
            this.oxygen = OXYGEN_PER_TRIP;
            this.blackedOut = false;
            this.cameras.main.fadeIn(500);
            blackoutText.destroy();
        });
    }

    // ── Collisions ──

    collectEgg(player, egg) {
        const points = egg.getData('points');
        const eggX = egg.x, eggY = egg.y;

        egg.destroy();
        this.currentDiveEggs++;

        // Visual feedback
        const txt = this.add.text(eggX, eggY - 20, `+${points}`, {
            fontSize: '28px', fill: '#ffcc33', fontWeight: 'bold',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        this.tweens.add({
            targets: txt, alpha: 0, y: txt.y - 40, duration: 800,
            onComplete: () => txt.destroy()
        });

        // Particles (reuse shared texture)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const sprite = this.add.sprite(eggX, eggY, 'particle-yellow');
            this.tweens.add({
                targets: sprite,
                x: eggX + Math.cos(angle) * 50,
                y: eggY + Math.sin(angle) * 50,
                alpha: 0, duration: 500,
                onComplete: () => sprite.destroy()
            });
        }
    }

    hitJellyfish(player, jelly) {
        if (jelly.getData('hitRecently')) return;
        jelly.setData('hitRecently', true);

        GameState.totalJellyfishHits++;

        // Time penalty
        GameState.globalTimer -= 2;
        if (GameState.globalTimer < 0) GameState.globalTimer = 0;

        // Oxygen penalty
        this.oxygen -= 3;
        if (this.oxygen < 0) this.oxygen = 0;

        // Knockback
        const dx = player.x - jelly.x;
        const dy = player.y - jelly.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        player.setVelocity((dx / dist) * 300, (dy / dist) * 300);

        // Visual
        this.cameras.main.shake(150, 0.006);
        const txt = this.add.text(player.x, player.y - 40, 'STUNG! -2s -3 O2', {
            fontSize: '24px', fill: '#ff66cc', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        this.tweens.add({
            targets: txt, alpha: 0, y: txt.y - 40, duration: 1000,
            onComplete: () => txt.destroy()
        });

        // Flash jelly
        this.tweens.add({
            targets: jelly, alpha: 0.3, yoyo: true, duration: 200, repeat: 2,
            onComplete: () => jelly.setData('hitRecently', false)
        });
    }

    // ── Ambient effects ──

    spawnAmbientBubble() {
        if (!this.isUnderwater) return;
        if (this.activeBubbleCount >= 20) return; // cap ambient bubbles

        const bx = this.player.x + (Math.random() - 0.5) * 800;
        const by = this.player.y + (Math.random() - 0.5) * 400;
        if (by < SURFACE_Y) return;

        this.activeBubbleCount = (this.activeBubbleCount || 0) + 1;
        const bubble = this.add.sprite(bx, by, 'bubble');
        bubble.setAlpha(0.3 + Math.random() * 0.3);
        bubble.setScale(0.5 + Math.random() * 1.5);
        this.tweens.add({
            targets: bubble,
            y: by - 100 - Math.random() * 200,
            x: bx + (Math.random() - 0.5) * 40,
            alpha: 0, duration: 2000 + Math.random() * 2000,
            onComplete: () => { bubble.destroy(); this.activeBubbleCount--; }
        });
    }

    spawnPlayerBubble() {
        if (this.activePlayerBubbleCount >= 8) return; // cap player bubbles

        this.activePlayerBubbleCount = (this.activePlayerBubbleCount || 0) + 1;
        const bubble = this.add.sprite(
            this.player.x + (Math.random() - 0.5) * 20,
            this.player.y - 20,
            'bubble'
        );
        bubble.setScale(0.4 + Math.random() * 0.6);
        this.tweens.add({
            targets: bubble,
            y: bubble.y - 40 - Math.random() * 40,
            alpha: 0, duration: 800 + Math.random() * 600,
            onComplete: () => { bubble.destroy(); this.activePlayerBubbleCount--; }
        });
    }

    // ── Level end ──

    endLevel() {
        this.gameState = 'ended';

        this._timerActive = false;
        if (this.bubbleTimer) this.bubbleTimer.destroy();
        if (this.playerBubbleTimer) this.playerBubbleTimer.destroy();
        if (this.uiTimer) this.uiTimer.destroy();
        if (this.jellyfishTimer) this.jellyfishTimer.destroy();
        this.physics.pause();

        // Bank any remaining dive eggs
        if (this.divingNow && this.currentDiveEggs > 0 && !this.isUnderwater) {
            GameState.eggsBanked += this.currentDiveEggs;
            GameState.totalEggsCollected += this.currentDiveEggs;
        }

        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.add.text(W * 0.5, H * 0.3, `LEVEL ${this.currentLevel} COMPLETE!`, {
            fontSize: '56px', fill: '#00ccff', fontWeight: 'bold',
            stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setScrollFactor(0);

        this.add.text(W * 0.5, H * 0.45,
            `Eggs banked: ${GameState.eggsBanked}\nDives: ${GameState.totalDives}`, {
                fontSize: '32px', fill: '#fff',
                stroke: '#000', strokeThickness: 3, align: 'center'
            }).setOrigin(0.5).setScrollFactor(0);

        if (this.currentLevel < GameState.totalLevels) {
            this.time.delayedCall(2500, () => {
                GameState.globalTimer = LEVEL_TIME; // reset timer for next level
                this.scene.start('GameScene', { level: this.currentLevel + 1 });
            });
        } else {
            // Game over - go to results
            this.time.delayedCall(2500, () => {
                const finalScore = this.calculateFinalScore();
                const gameData = {
                    finalScore,
                    totalEggsCollected: GameState.totalEggsCollected,
                    eggsBanked: GameState.eggsBanked,
                    totalDives: GameState.totalDives,
                    totalJellyfishHits: GameState.totalJellyfishHits,
                    totalOxygenDepletions: GameState.totalOxygenDepletions,
                    diveLog: GameState.diveLog,
                    totalElapsedTime: (Date.now() - GameState.startTimestamp) / 1000,
                    levelsCompleted: GameState.totalLevels,
                    timestamp: new Date().toISOString(),
                };
                this.saveGameData(gameData);
                this.scene.start('ResultsScene', gameData);
            });
        }
    }

    calculateFinalScore() {
        // Depth-weighted egg score from dive log
        let eggScore = 0;
        GameState.diveLog.forEach(dive => {
            if (dive.surfacedSafely) {
                eggScore += dive.eggsCollected * (10 + Math.floor(dive.depthReached / 10));
            }
        });
        return eggScore + Math.round(GameState.globalTimer * 5);
    }

    async saveGameData(gameData) {
        try {
            await updateDatabase(gameData, 'diving-risk');
        } catch (error) {
            console.error('Failed to save game data:', error);
        }
    }
}

// ─────────────────────────────────────────
// Results Scene
// ─────────────────────────────────────────
class ResultsScene extends Phaser.Scene {
    constructor() { super({ key: 'ResultsScene' }); }

    init(data) { this.gameData = data; }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        this.cameras.main.setBackgroundColor('#001830');

        this.add.text(W * 0.5, H * 0.1, 'EXPEDITION COMPLETE!', {
            fontSize: '56px', fill: '#00ccff', fontWeight: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(W * 0.5, H * 0.2, `FINAL SCORE: ${Math.round(this.gameData.finalScore)}`, {
            fontSize: '52px', fill: '#ffd700', fontWeight: 'bold',
            stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5);

        const results = [
            `Eggs Banked: ${this.gameData.eggsBanked}`,
            `Total Eggs Found: ${this.gameData.totalEggsCollected}`,
            `Total Dives: ${this.gameData.totalDives}`,
            `Jellyfish Stings: ${this.gameData.totalJellyfishHits}`,
            `Oxygen Depletions: ${this.gameData.totalOxygenDepletions}`,
            `Real Time: ${this.gameData.totalElapsedTime.toFixed(1)}s`,
        ];

        let y = H * 0.32;
        results.forEach(text => {
            this.add.text(W * 0.5, y, text, {
                fontSize: '30px', fill: '#fff', stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5);
            y += 50;
        });

        // Dive-by-dive breakdown (BART analysis data)
        if (this.gameData.diveLog && this.gameData.diveLog.length > 0) {
            this.add.text(W * 0.5, y + 20, 'DIVE LOG:', {
                fontSize: '28px', fill: '#00ccff', stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5);

            y += 60;
            const logStartY = y;
            const maxVisible = Math.min(this.gameData.diveLog.length, 8);

            for (let i = 0; i < maxVisible; i++) {
                const d = this.gameData.diveLog[i];
                const status = d.surfacedSafely ? '  Safe' : '  LOST';
                const statusColor = d.surfacedSafely ? '#00ff88' : '#ff4444';
                this.add.text(W * 0.2, y,
                    `Dive ${i + 1}: ${d.depthReached}m deep, ${d.eggsCollected} eggs`, {
                        fontSize: '22px', fill: '#ccc', stroke: '#000', strokeThickness: 2
                    });
                this.add.text(W * 0.75, y, status, {
                    fontSize: '22px', fill: statusColor, stroke: '#000', strokeThickness: 2
                });
                y += 35;
            }

            if (this.gameData.diveLog.length > maxVisible) {
                this.add.text(W * 0.5, y, `... and ${this.gameData.diveLog.length - maxVisible} more dives`, {
                    fontSize: '20px', fill: '#888'
                }).setOrigin(0.5);
            }
        }

        this.add.text(W * 0.5, H * 0.92, 'Press SPACE for highscores | R to restart', {
            fontSize: '26px', fill: '#ffff00', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        this.input.keyboard.addKey('SPACE').on('down', () => this.showHighscores());
        this.input.keyboard.addKey('R').on('down', () => this.scene.start('InstructionsScene'));
        this.input.on('pointerdown', () => this.scene.start('InstructionsScene'));
    }

    async showHighscores() {
        try {
            const scores = await getHighscores(
                'diving-risk',
                'experiment_payload->>finalScore',
                false,
                (q) => q.limit(10)
            );

            this.children.each(c => c.destroy());
            const W = this.sys.game.config.width;
            const H = this.sys.game.config.height;

            this.add.text(W * 0.5, 60, 'HIGH SCORES', {
                fontSize: '52px', fill: '#fff', fontWeight: 'bold',
                stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5);

            // Headers
            this.add.text(W * 0.1, 130, 'Player', { fontSize: '28px', fill: '#ffff00' });
            this.add.text(W * 0.5, 130, 'Score', { fontSize: '28px', fill: '#ffff00' }).setOrigin(0.5);
            this.add.text(W * 0.7, 130, 'Eggs', { fontSize: '28px', fill: '#ffff00' }).setOrigin(0.5);
            this.add.text(W * 0.85, 130, 'Dives', { fontSize: '28px', fill: '#ffff00' }).setOrigin(0.5);

            let y = 180;
            (scores || []).slice(0, 10).forEach((score, i) => {
                const p = score.experiment_payload;
                let name = score.nickname || 'Anonymous';
                if (name.length > 15) name = name.substring(0, 12) + '...';

                this.add.text(W * 0.1, y, `${i + 1}. ${name}`, { fontSize: '24px', fill: '#fff' });
                this.add.text(W * 0.5, y, Math.round(p.finalScore || 0), {
                    fontSize: '24px', fill: '#ffd700'
                }).setOrigin(0.5);
                this.add.text(W * 0.7, y, p.eggsBanked || 0, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
                this.add.text(W * 0.85, y, p.totalDives || 0, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
                y += 45;
            });

            this.add.text(W * 0.5, H - 60, 'Press R to restart', {
                fontSize: '26px', fill: '#ffff00', stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5);

        } catch (err) {
            console.error('Failed to load highscores:', err);
        }
    }
}

// ── Initialize ──
const baseConfig = PsyExpBaseConfig([InstructionsScene, GameScene, ResultsScene]);
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
