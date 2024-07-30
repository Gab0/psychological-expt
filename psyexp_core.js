
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

const db_url = "https://obxyvfzojhcpfeeoxrez.supabase.co"
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHl2ZnpvamhjcGZlZW94cmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAxMTE1MTIsImV4cCI6MjAzNTY4NzUxMn0.a6-Ff7bzShSloowgJMxVCyB8DACAVOy5_P2a3hhRBBY";

export const db = supabase.createClient(db_url, token);

function makeid(length) {
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

export let nickname = null;
const result = await db.rpc("gen_nickname").then((res) => {
  console.log(res);
  nickname = res.data;
})

console.log(result);
