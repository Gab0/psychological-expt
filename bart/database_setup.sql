ALTER TABLE bart_runs ADD PRIMARY KEY (id);

REVOKE ALL on public.bart_runs from anon;


CREATE OR REPLACE FUNCTION bartupdate(
    p_id varchar,
    p_score float8,
    p_balloons text,
    p_explosions text,
    p_balloonschedule text,
    p_useragent text,
    p_timestamps text,
    p_nickname text
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.bart_runs
    VALUES (p_id, p_score, p_balloons, p_balloonschedule, p_useragent, p_timestamps, p_nickname, p_explosions, null)
    ON CONFLICT (id) 
    DO UPDATE set
    	id = EXCLUDED.id,
        score = EXCLUDED.score,
        balloons = EXCLUDED.balloons,
	    balloonschedule = EXCLUDED.balloonschedule,
	    useragent = EXCLUDED.useragent,
	    timestamps = EXCLUDED.timestamps,
	    nickname = EXCLUDED.nickname,
	    explosions = EXCLUDED.explosions,
	    user_nickname = EXCLUDED.user_nickname;

END;
$$ LANGUAGE plpgsql security definer;


CREATE or replace VIEW bart_highscores AS
SELECT score, balloons, timestamps, nickname
FROM public.bart_runs
order by score DESC;

REVOKE ALL on bart_highscores from anon;
GRANT SELECT on bart_highscores TO anon;

grant EXECUTE on function bartupdate to anon;
