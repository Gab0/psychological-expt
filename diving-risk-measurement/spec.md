 
## About

- This is a 2D platform-like diving game, also a psychological experiment.
- Borrowing from Super Mario Bros and Subnautica.
- The functionality is like BART: measuring risk assessment capabilities of the player.

## Overview

- The scenario is 2D platform, but most of the level is submerged.
- The player-controlled character is a diver, with a scuba tank that has 30s of oxygen on each trip.
- There is a global countdoun on each level, which starts at 1m30s.
- There are dinosaur eggs scattered at random locations on each level. However, the random seed is locked! So under default conditions, all eggs are on the same place everytime.
- There are 3 different levels will increasing levels of difficulty.
- There must be plenty of eggs in the level so it is impossible to retrieve them all in the alloted time, while giving the player enough strategical headroom.
- The scenario must have some floating platforms to allow for quick horizontal navigation prior to the diving.

## Global

- At the end, we must show a highscores table.
- The game must have a fps counter at the top right corner.
- The game must run at stable 60fps on a common browser.
- The timer must be anchored to some real-time measurement, independent from FPS fluctuations.


## Performance

- Avoid unecessary 'update()'. Ensure nothing heavy is calculated in the update too often.
- Use time.delayedCall to improve performance.
