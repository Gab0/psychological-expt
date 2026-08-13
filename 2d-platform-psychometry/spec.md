https://chatgpt.com/c/6970ec35-c718-8327-84ab-5049fc44b618
https://chatgpt.com/c/69759221-efcc-8327-933e-ea75ac69ceb4

## About

Can you leverage phaser.js to write a 2D platform game like the classic Super Mario Bros games but with modern feel and  plausible physics?

- The character is a man with dark overalls and white hair. He holds balloons, but starts with none.
- The enemies are crows that only walk in the floor
- Levels are about 3-screen wide horizontal hallway with deterministically-generated floating platforms.
  - Level 1: 2 platforms, 20 enemy crows.
  - Level 2: 5 platforms, 2 holes, 30 enemy crows.
  - Level 3: 10 platforms, 10 holes, 60 enemy crows.
  - Level 4: 13 platforms, 15 holes, 80 enemy crows.
  
- The players starts at the left and walks down to the right, where a door seals the end of the level.
- The sprites must have an idle animation, and the game feel must be nice.
- Performance must be as optimized as possible. Show a fps counter at the top right corner.
- The crow positions must be deterministic with a locked random seed for reproducibility.
- The game must feel very nice to play, just like a game made with a more advanced engine such as Unity. Actions must have feedback.

## Core mechanics

- There is a global countdown clock. If the player touches a crow, a second is deduced. That's the only occasion where a second is deduced.
- Negative seconds are allowed. Scores will be calculated accordingly.
- There is no game over.
- Whenever balloons are available, the player may press and hold down, when he being to pump and inflate the balloons. Once they are fully inflated, the player will fly and reach the sky and the level will end in victory.
- The bottom of the holes are filled with spikes. Touching the spikes make the player lose 2s and he is sent flying to the upper right diagonal.
- Ensure enemies do not enter the holes.
- The player character is able to jump and double jump. Nothing else.
- There are balloons scatrered in specific locations of each level. Each one has an implicit level of difficulty, based on its height from the floor and perceived reach difficulty.
- Balloons do carry over to the next level, but balloons from earlier levels are not usable as fart boosts and do not affect mobility. They should appear greyed out at the HUD.
- When the player hits a crow, the crow explodes and disappears. Beware to not move the player down when this happens.
- HUD elements must not juxtapose for clarity.
- When the player eats an balloon, he gets fatter, move slower and jump slower.
- When the user eats 10 burguers, his speed and jump becomes 1/3 of the original. Each burguer should affect parameters proportionally.
- There is a counter at the top of the screen showing the number of burgers eaten. Each balloon sprite must be shown individually.
- When the player starts a new level, 30 seconds are added to the counter.
- Final score: number of burguers eaten multiplied by 10 plus the number of seconds remaining when the level is completed multiplied by 5. 
- The current score must be shown at the screen at all times.
- In order to maximize cleaner BART comparability and measure risk taking, not motor dexterity, we need to: keep crow speed very slow and predictable, avoid precision platforming, make failure mostly about time pressure and greed, not dexterity.

## Controllers

- A mouse click/touch should be able to allow the skip of the initial text screen.
- The game must be playable from a smartphone. The screen must be split with a X (unseen). Each area of the split, when clicked, trigger a WASD-like movement key. e.g. The right section of the X triggers the 'right' (D) button.
- Ensure all available input methods are described in the initial text screen.

## Visuals

- The 'ground' of the map must not be a floating platform, the ground blocks should come from the unseen area.
- Ensure the door appears naturally at the top of the floor block.
- Ensure enemies are unable to change direction very quickly to ensure visual comfort.
- When the player loses seconds, the screen should not flash in read. Insted, a small clock should be seen dropping from the player.
- Ensure no text obstructs the view of the highscores table numbers.
- The initial greeting text seems too long to be displayed in a single screen. Split it in two subsequent screens.
- The player sprite must be seen from the side, just like Super Mario Bros.
- Have micro-feedback after each burger, matching movement speed loss: Slightly heavier footstep sound, Subtle squash/stretch increase, Tiny delay in jump apex
- Have three burger counters: total_burgers_eaten (score), active_burgers_this_level (affects physics), stored_burgers (greyed, inert)

## Technical details/avoiding bugs

- Ensure the level restart system is smooth and bugfree.
- The crow movement must be smooth, cool and slow at all stages of the game.
- Sometimes the crows become erratic, facing opposite sides very fast. We don't want this.
- The hisghscores page must correctly display the past player names.
- Some emojis may not render in all fonts, please ensure everything is rendered and no sprite is missing.
- Ensure the player sprite clearly displays the direction he is facing, with a nose or glasses or some detail that makes it obvious.
- Ensure the burgers do not overlap with platforms.
- Ensure NPC starting position do not share the same X coordinate boundaries with hole/spike areas.
- Ensure the platform and floor sprites do not overlap anything else.
