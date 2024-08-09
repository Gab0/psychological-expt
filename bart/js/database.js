
import { db, nickname, run_id } from '../../psyexp_core.js';


export async function getHighscores() {
  const {data, error} = await db.from('bart_highscores').select().neq("nickname", null).limit(15);
  console.log(error);
  console.log(data);
  return data;
}

export async function update_database(score, balloons, explosions, balloonSchedule) {

  console.log("Updating database");

  timestamps.push(new Date().toISOString());

  const payload = {
    p_id: run_id,
    p_score: score,
    p_balloons: balloons,
    p_explosions: explosions,
    p_balloonschedule: balloonSchedule,
    p_useragent: window.navigator.userAgent,
    p_timestamps: timestamps,
    p_nickname: nickname
  }

  const res = await db.rpc('bartupdate', payload);
  console.log(res);
}

let timestamps = [];
