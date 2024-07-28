 
CREATE TABLE tmt_runs
(
    id character varying NOT NULL,
    score_a double precision NULL,
    score_b double precision NULL,
    timestamps_a text null,
    timestamps_b text null,
    useragent character varying NULL,
    nickname character varying NULL,
    user_nickname text NULL
);


ALTER TABLE tmt_runs ADD PRIMARY KEY (id);



REVOKE ALL on public.tmt_runs from anon;
grant insert on public.tmt_runs to anon;


CREATE or replace VIEW tmt_highscores AS
SELECT (coalesce(score_a, 0) + coalesce(score_b, 0)) as score, nickname
FROM public.tmt_runs
order by score_a ASC;

REVOKE ALL on tmt_highscores from anon;
GRANT SELECT on tmt_highscores TO anon;

