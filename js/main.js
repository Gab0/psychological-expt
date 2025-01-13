 
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

document.getElementById('store_settings').addEventListener('click', function() {
  setCookie('username', username_input.value, 365);

  const selectedLanguage = document.querySelector('input[name="language"]:checked').value;
  setCookie('language', selectedLanguage, 365);
});

document.getElementById('random_username').addEventListener('click', async function() {
  await reloadNickname();
  username_input.value = nickname;
});

