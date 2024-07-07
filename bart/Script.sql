ALTER TABLE bart_runs ADD PRIMARY KEY (id);

GRANT ALL on public.bart_runs TO anon;


REVOKE ALL on public.bart_runs from anon;
GRANT INSERT on public.bart_runs TO anon;
GRANT UPDATE on public.bart_runs TO anon;
GRANT SELECT on public.bart_runs TO anon;


CREATE OR REPLACE FUNCTION bartupdate(
    p_id varchar,
    p_score float8,
    p_balloons text,
    p_balloonschedule text,
    p_useragent text,
    p_timestamps text,
    p_nickname text
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.bart_runs
    VALUES (p_id, p_score, p_balloons, p_balloonschedule, p_useragent, p_timestamps, p_nickname)
    ON CONFLICT (id) 
    DO UPDATE set
    	id = EXCLUDED.id,
        score = EXCLUDED.score,
        balloons = EXCLUDED.balloons,
	    balloonschedule = EXCLUDED.balloonschedule,
	    useragent = EXCLUDED.useragent,
	    timestamps = EXCLUDED.timestamps,
	    nickname = EXCLUDED.nickname;
END;
$$ LANGUAGE plpgsql security definer;


CREATE VIEW bart_highscores AS
SELECT score, balloons, timestamps
FROM public.bart_runs;

REVOKE ALL on bart_highscores from anon;
GRANT SELECT on bart_highscores TO anon;



grant EXECUTE on function bartupdate to anon;
DROP FUNCTION bartupdate(character varying,double precision,text,text,text,text);
NOTIFY pgrst, 'reload schema';
REVOKE UPSERT on public.bart_runs from anon;
