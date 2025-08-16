 
import { nickname, reloadNickname, setCookie, getCookie } from '../psyexp_core.js';

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
    bart: {
        title: 'Balloon Analogue Risk Task (BART)',
        description: 'A measure of risk-taking behavior. Participants earn points by pumping up a balloon, but lose points if it pops.'
    },
    tmt: {
        title: 'Trail Making Test (TMT)',
        description: 'A test of visual attention and task switching. Participants connect a sequence of dots in order as quickly as possible.'
    },
    nback: {
        title: 'n-Back Task (n=2)',
        description: 'A task to measure working memory. Participants must indicate when the current stimulus matches the one from n steps earlier in the sequence.'
    },
    srtt: {
        title: 'Serial Reaction Time Task (SRTT)',
        description: 'Measures implicit motor learning. Participants respond to a series of visual cues that follow a repeating pattern.'
    },
    sdltnt: {
        title: 'Serial-Digit Learning Test (Trials to Criterion) (SDLTNT)',
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

