
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
    largest: { fontSize: '52px', fill: '#000', fontWeight: 'bold' }
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

export async function fetchMessages(language) {
  const {data, error} = await db.from('interface_messages')
                                .select("*")
                                .eq('language', language);
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

export const reloadNickname = async () => {
  const result = await db.rpc("gen_nickname").then((res) => {
    console.log(res);
    nickname = res.data;
  })
};

if (nickname === null) {
    reloadNickname();
}
