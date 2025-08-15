# About

This project is composed of a series of psychological experiments.

- Each experiment is a Phaser.js game.
- They use the common library `psyexp_core.js`. Each experiment should reuse functionality from this module as much as possible.
- Each experiment is self-contained, but they share the same database, overall structure and library.
- Experiment directories are named by their title, as they appear under the 'Experiments' section of this document.
- Directories that end with an integer are older implementations of experiments. You can read them to gather insights but never modify.
- Every experiment must display a highscores page at the end. The common library can with this.
- There is a 'portal' which is the initial page of the website that routes users/subjects across different experiments, while also displaying useful information on the experiments.


## Portal

- A modern single-page static .html frontend under `index.html`.
- Have a field to select the language and user name. Typing on the username text field or clicking the language radio selector stores the variable value as cookies using methods declared in the common library.
- Have a menu with multiple experiments. There is a button that links to the experiment, along with another button that displays information about a given experiment including a highscores table. There is a pane that displays information for the last selected experiment.


## Experiments

### rlt

Reverse Learning Task (RLT): two-choice probabilistic learning with a mid-task reversal.

- __Stimuli__
  - Two fixed stimuli: `A` (blue square) and `B` (red circle).
  - At start, `A` is designated-correct (higher reward probability). At the midpoint, designation flips to `B`.

- __Controls__
  - Mouse: click a shape.
  - Keyboard: LEFT selects the left shape; RIGHT selects the right shape.

- __Structure__
  - Practice: 10 trials recorded..
  - Main game: 80 trials recorded.

- __Trial flow__
  1. Randomize left/right positions of `A` and `B`.
  2. At on average once per 10 trials, reversal between scores yielded by `A` and `B` occurs.
  2. Await response (timeout below). Record reaction time from stimulus onset.
  3. Outcome is probabilistic based on the chosen stimulus designation:
     - If chosen stimulus is designated-correct: +1 with 75% chance; -1 with 25%.
     - If chosen stimulus is designated-wrong: +1 with 25% chance; -1 with 75%.
  4. Show feedback text (+1 or -1) briefly, then advance.

- __Timing__
  - Response timeout: 3000 ms. If no response, count as -1 and continue.
  - Feedback display: 1200 ms.

- __Scoring__
  - Score starts at 0. Each trial changes score by +1 or -1.
  - Practice score is shown; main-game score is persisted.

- __Data saved__ (DB key `rlt` via `updateDatabase`)
  - `final_score`: number
  - `total_trials`: 80
  - `learning_target_choice_rate`: percent choosing designated-correct 
  - `reversal_target_choice_rate`: percent choosing designated-correct when `A` and `B` were reversed.
  - `avg_reaction_time`: average RT (ms) across main trials
  - `trial_data`: array of per-trial objects with fields:
    - `trial`: 1..80
    - `phase`: `learning` | `reversal`
    - `chosenSide`: `left` | `right` | `timeout`
    - `chosenStim`: `A` | `B` | null (null on timeout)
    - `chosenIsDesignatedCorrect`: boolean
    - `reward`: +1 | -1
    - `score`: cumulative after the trial
    - `rt`: reaction time in ms
    - `leftStim` / `rightStim`: `A` or `B`

- __Feedback__
  - Text `+1` in green for reward; `-1` in red for loss.

- __Highscores__
  - Sorted by `final_score` (desc). Display includes: Rank, Name, Score, Target % (uses `learning_target_choice_rate`).

- __Localization__
  - Instructions pulled from `fetchMessages('en-us', 'rlt')` when available; defaults embedded otherwise.

- __Implementation files__
  - `rlt/index.html` (Phaser 3.55.2, Supabase client loaded; module script)
  - `rlt/js/game.js` (scenes: Instructions, Practice, Game; uses `PsyExpBaseConfig`, `fetchMessages`, `updateDatabase`, `getHighscores` from `psyexp_core.js`)
