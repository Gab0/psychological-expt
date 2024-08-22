 
import { nickname, reloadNickname, setCookie, getCookie } from '../psyexp_core.js';

const username_input = document.getElementById('username');

username_input.value = getCookie('username');


document.getElementById('set_username').addEventListener('click', function() {
  setCookie('username', username_input.value, 365);
});

document.getElementById('random_username').addEventListener('click', async function() {
  await reloadNickname();
  username_input.value = nickname;
});

