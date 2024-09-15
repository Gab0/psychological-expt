
export const PsyExpBaseConfig = (scenes) => {
    return {
      type: Phaser.WEBGL,
      antialias: true,
      width: 1920,
      height: 1000,
      backgroundColor: '#000000',
      scene: scenes,
      fps: {
        min: 60,
        target: 60,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER,
        orientation: 'landscape',
      },
    }
};

export const font = {
  normal: { fontSize: '40px', fill: '#000', backgroundColor: '#f0f0f0' },
  larger: { fontSize: '44px', fill: '#101010', backgroundColor: '#f0f0f0' },
  largest: { fontSize: '52px', fill: '#000', fontWeight: 'bold' },
  help: { fontSize: 24, fill: '#fff' }
}

const db_url = "https://obxyvfzojhcpfeeoxrez.supabase.co"
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHl2ZnpvamhjcGZlZW94cmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAxMTE1MTIsImV4cCI6MjAzNTY4NzUxMn0.a6-Ff7bzShSloowgJMxVCyB8DACAVOy5_P2a3hhRBBY";

export const db = supabase.createClient(db_url, token);

export function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function processMessageData(query_result) {

  const messageMap = {};

  query_result.map((res) => {
    messageMap[res.identifier] = res.message;
  });

  return messageMap;
}

export async function fetchMessages(language, game) {
  const {data, error} = await db.from('interface_messages')
                                .select("*")
                                .eq('language', language)
                                .eq('experiment', game)
                                .eq('outdated', false);
  return processMessageData(data);
}

export const run_id = makeid(10);


export function setCookie(name, value, days) {
    // Create a date for the expiration
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "expires=" + date.toUTCString();

    // Set the cookie
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

export function getCookie(name) {
    var nameEQ = name + "=";
    var cookiesArray = document.cookie.split(';');

    for(var i = 0; i < cookiesArray.length; i++) {
        var cookie = cookiesArray[i].trim();

        if (cookie.indexOf(nameEQ) == 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }

    return null; // Return null if the cookie is not found
}

export let nickname = getCookie("username");

export let userId = getCookie("user_id");
if (userId === null) {
    userId = makeid(10);
    // setCookie("user_id", userId, 365);
}

export const reloadNickname = async () => {
  const result = await db.rpc("gen_nickname").then((res) => {
    console.log(res);
    nickname = res.data;
  })
};

if (nickname === null) {
    reloadNickname();
}


export class StandardBriefingScene extends Phaser.Scene {
    constructor(gameName, messages, sceneName, nextSceneName) {
      super({key: sceneName});

      this.messages = messages;
      this.nextSceneName = nextSceneName;
      this.gameName = gameName;
    }

    create() {

      this.messageIndex = 0;

      const W = this.sys.game.config.width;
      const H = this.sys.game.config.height;

      this.add.text(W * 0.5, H * 0.1, this.gameName, font.larger).setOrigin(0.5);
     
      console.log(this.messages[this.messageIndex]);
      this.message = this.add.text(
        W * 0.5,
        H * 0.5,
        this.messages[this.messageIndex],
        font.larger
      ).setOrigin(0.5);

      this.input.keyboard.on('keydown-SPACE', () => {
        this.updateMessage();
      });

      this.input.on('pointerdown', () => {
        this.updateMessage()
      });
    }

    updateMessage() {

      if (this.messageIndex === this.messages.length - 1) {
        this.scene.start(this.nextSceneName);
        return
      }

      this.messageIndex++;
      this.message.setText(this.messages[this.messageIndex]);
    }
}


export async function updateDatabase(
  experimentPayload,
  experimentId
) {

  const payload = {
    run_id: run_id,
    user_id: userId,
    nickname: nickname,
    experiment_payload: experimentPayload,
    experiment_id: experimentId,
    useragent: window.navigator.userAgent,
  }

  const res = await db.rpc('update_experiment_run', payload);
  console.log(res);
}

export async function getHighscores(
  experimentId,
  orderExpression,
  ascending = true,
  further_filtering = (x) => {x}
) {

  const query = db.rpc(
    'view_experiment_runs',
    {target_experiment_id: experimentId}
  )
                  .select()
                  .neq("nickname", null)
                  .order(orderExpression, {ascending: ascending});

  const {data, error} = await further_filtering(query).limit(15);

  console.log(error);
  console.log(data);
  return data;
}

export function displayHighscores(W, H, scores, renderSingleScore) {
  let y = H * 0.23;
  let i = 1;
  scores.map((score) => {
    const v = renderSingleScore(score);
    if (v === undefined) return;

    this.add.text(W * 0.2, y, `${i}.`, font.larger);
    this.add.text(W * 0.3, y, `${score.nickname}`, font.larger);
    this.add.text(W * 0.7, y, v, font.larger);
    i++;
    y += H * 0.05;
  });
};
