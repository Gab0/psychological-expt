
const db_url = "https://obxyvfzojhcpfeeoxrez.supabase.co"
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHl2ZnpvamhjcGZlZW94cmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAxMTE1MTIsImV4cCI6MjAzNTY4NzUxMn0.a6-Ff7bzShSloowgJMxVCyB8DACAVOy5_P2a3hhRBBY";

const db = supabase.createClient(db_url, token);


export async function update_database(score, balloons, balloonSchedule) {

  console.log("Updating database");

  timestamps.push(new Date().toISOString());

  const payload = {
    id: run_id,
    score: score,
    balloons: balloons,
    balloonschedule: balloonSchedule,
    useragent: window.navigator.userAgent,
    timestamps: timestamps
  }

  const res = await db.rpc('bartupdate', payload);
  console.log(res);
}

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

const run_id = makeid(10);
let timestamps = [];
