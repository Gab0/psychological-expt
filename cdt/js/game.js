// Ensure you have Phaser.js loaded in your project.

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

let originalItems = [];
let newItems = [];
let changeDetected = false;
let changeMade = false;
let text;
let trialStarted = false;

function preload() {
    // Load assets (if any)
}

function create() {
    // Create original items
    originalItems = createItems(this, 6); // For example, 6 items

    // Create text
    text = this.add.text(10, 10, 'Press SPACE to start', { font: '16px Arial', fill: '#ffffff' });

    // Handle input
    this.input.keyboard.on('keydown-SPACE', startTrial, this);
    this.input.keyboard.on('keydown-Y', () => detectChange(true), this);
    this.input.keyboard.on('keydown-N', () => detectChange(false), this);
}

function update() {
    if (trialStarted) {
        // Add logic to hide original items after a delay, then show new items
    }
}

function createItems(scene, numItems) {
    let items = [];
    for (let i = 0; i < numItems; i++) {
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(50, 550);
        let item = scene.add.circle(x, y, 20, 0x6666ff);
        items.push(item);
    }
    return items;
}

function startTrial() {
    trialStarted = true;
    text.setText('Memorize the items...');

    // Hide original items after a short delay
    scene.time.delayedCall(1000, () => {
        originalItems.forEach(item => item.setVisible(false));
        text.setText('Detect the change...');

        // Create new items with a possible change
        newItems = createItems(this, 6);

        // Introduce a change in one item
        if (Phaser.Math.Between(0, 1) === 1) {
            changeMade = true;
            newItems[Phaser.Math.Between(0, 5)].fillColor = 0xff0000; // Change color of one item
        }
    }, [], this);
}

function detectChange(userDetectedChange) {
    if (userDetectedChange === changeMade) {
        text.setText('Correct!');
    } else {
        text.setText('Incorrect.');
    }

    // Reset for next trial
    resetTrial();
}

function resetTrial() {
    trialStarted = false;
    changeMade = false;
    originalItems.forEach(item => item.destroy());
    newItems.forEach(item => item.destroy());
    originalItems = [];
    newItems = [];
    text.setText('Press SPACE to start');
}

