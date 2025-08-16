 
import { nickname, reloadNickname, setCookie, getCookie, getHighscores } from '../psyexp_core.js';

const username_input = document.getElementById('username');
username_input.value = getCookie('username');

let languageSelectors = document.getElementsByName('language');
let chosenLanguage = getCookie('language');

for (let radio of languageSelectors) {
    if (radio.value === chosenLanguage) {
        radio.checked = true;
        break;
    }
  }

const experimentInfo = {
    rlt: {
        title: 'Reverse Learning Task',
        description: 'A test of cognitive flexibility. Participants must learn to choose the correct stimulus and adapt when the correct choice is reversed.'
    },
    bart: {
        title: 'Balloon Analogue Risk Task',
        description: 'A measure of risk-taking behavior. Participants earn points by pumping up a balloon, but lose points if it pops.'
    },
    tmt: {
        title: 'Trail Making Test',
        description: 'A test of visual attention and task switching. Participants connect a sequence of dots in order as quickly as possible.'
    },
    nback: {
        title: 'n-Back Task (n=2)',
        description: 'A task to measure working memory. Participants must indicate when the current stimulus matches the one from n steps earlier in the sequence.'
    },
    srtt: {
        title: 'Serial Reaction Time Task',
        description: 'Measures implicit motor learning. Participants respond to a series of visual cues that follow a repeating pattern.'
    },
    sdltnt: {
        title: 'Serial-Digit Learning Test (Trials to Criterion)',
        description: 'A test of verbal learning and memory. Participants must recall a sequence of digits, with the sequence length increasing over trials.'
    },
    gonogo: {
        title: 'Go/No-Go Task',
        description: 'A test of response inhibition. Participants must respond to \'Go\' stimuli and withhold responses to \'No-Go\' stimuli.'
    },
    'hanoi-3': {
        title: 'Tower of Hanoi (3 Disks)',
        description: 'A classic puzzle that tests problem-solving and planning abilities. The goal is to move a stack of disks from one rod to another, following specific rules.'
    },
    'hanoi-5': {
        title: 'Tower of Hanoi (5 Disks)',
        description: 'A more challenging version of the Tower of Hanoi puzzle with 5 disks.'
    },
    'hanoi-7': {
        title: 'Tower of Hanoi (7 Disks)',
        description: 'A very challenging version of the Tower of Hanoi puzzle with 7 disks.'
    },
    'hanoi-9': {
        title: 'Tower of Hanoi (9 Disks)',
        description: 'An expert-level version of the Tower of Hanoi puzzle with 9 disks.'
    }
};

const highscoreConfig = {
    rlt: {
        order: 'final_score',
        ascending: false,
        render: (score) => `<td>${score.nickname}</td><td>${score.experiment_payload.final_score}</td><td>${(score.experiment_payload.learning_target_choice_rate * 100).toFixed(0)}%</td>`,
        header: '<th>Name</th><th>Score</th><th>Target %</th>'
    },
    bart: {
        order: 'experiment_payload->>totalScore',
        ascending: false,
        render: (score) => `<td>${score.nickname}</td><td>${score.experiment_payload.totalScore.toFixed(2)}</td>`,
        header: '<th>Name</th><th>Total Score</th>'
    },
    tmt: {
        order: 'experiment_payload->>combinedTimes',
        ascending: true,
        render: (score) => `<td>${score.nickname}</td><td>${(score.experiment_payload.combinedTimes / 1000).toFixed(2)}s</td>`,
        header: '<th>Name</th><th>Time (s)</th>'
    },
    gonogo: {
        order: 'correct_responses',
        ascending: false,
        render: (score) => `<td>${score.nickname}</td><td>${score.correct_responses}</td>`,
        header: '<th>Name</th><th>Correct Responses</th>'
    },
    hanoi: {
        order: 'experiment_payload->>elapsed_time',
        ascending: true,
        render: (score) => `<td>${score.nickname}</td><td>${score.experiment_payload.nb_move}</td><td>${score.experiment_payload.elapsed_time.toFixed(2)}s</td>`,
        header: '<th>Name</th><th>Moves</th><th>Time (s)</th>'
    },
    nback: {
        order: 'experiment_payload->>winRatio',
        ascending: false,
        render: (score) => `<td>${score.nickname}</td><td>${(score.experiment_payload.winRatio * 100).toFixed(2)}%</td>`,
        header: '<th>Name</th><th>Win Ratio</th>'
    },
    sdltnt: {
        order: 'experiment_payload->>winRatio',
        ascending: false,
        render: (score) => `<td>${score.nickname}</td><td>${(score.experiment_payload.winRatio * 100).toFixed(2)}%</td>`,
        header: '<th>Name</th><th>Win Ratio</th>'
    },
    srtt: {
        order: 'experiment_payload->>meanReactionTime',
        ascending: true,
        render: (score) => `<td>${score.nickname}</td><td>${score.experiment_payload.meanReactionTime.toFixed(2)}ms</td>`,
        header: '<th>Name</th><th>Avg. Reaction Time (ms)</th>'
    },
    // Add other experiments here
};

document.querySelectorAll('.highscore-btn').forEach(button => {
    button.addEventListener('click', async function() {
        const expKey = this.getAttribute('data-exp');
        let config = highscoreConfig[expKey];
        let filter = null;

        if (expKey.startsWith('hanoi-')) {
            const diskCount = parseInt(expKey.split('-')[1], 10);
            config = highscoreConfig['hanoi'];
            filter = (q) => q.eq('experiment_payload->>nb_disk', diskCount);
        }
        const infoContent = document.getElementById('info-content');

        if (!config) {
            infoContent.innerHTML = '<p>Highscores not available for this experiment.</p>';
            return;
        }

        infoContent.innerHTML = '<p>Loading highscores...</p>';

        try {
            const scores = await getHighscores(expKey.split('-')[0], config.order, config.ascending, filter);
            if (scores && scores.length > 0) {
                let tableHtml = `<table class="highscore-table"><thead><tr><th>Rank</th>${config.header}</tr></thead><tbody>`;
                scores.forEach((score, index) => {
                    tableHtml += `<tr><td>${index + 1}</td>${config.render(score)}</tr>`;
                });
                tableHtml += '</tbody></table>';
                infoContent.innerHTML = tableHtml;
            } else {
                infoContent.innerHTML = '<p>No highscores found.</p>';
            }
        } catch (error) {
            console.error('Error fetching highscores:', error);
            infoContent.innerHTML = '<p>Could not load highscores.</p>';
        }
    });
});

document.querySelectorAll('.info-btn').forEach(button => {
    button.addEventListener('click', function() {
        const expKey = this.getAttribute('data-exp');
        const info = experimentInfo[expKey];
        const infoContent = document.getElementById('info-content');

        if (info) {
            infoContent.innerHTML = `<h4>${info.title}</h4><p>${info.description}</p>`;
        } else {
            infoContent.innerHTML = '<p>Information not available.</p>';
        }
    });
});

username_input.addEventListener('input', function() {
    setCookie('username', this.value, 365);
});

for (let radio of languageSelectors) {
    radio.addEventListener('change', function() {
        if (this.checked) {
            setCookie('language', this.value, 365);
        }
    });
}

document.getElementById('random_username').addEventListener('click', async function() {
  await reloadNickname();
  username_input.value = nickname;
});

