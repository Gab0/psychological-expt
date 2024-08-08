 
CREATE TABLE srtt_runs
(
    id character varying NOT NULL,
    useragent character varying NULL,
    nickname character varying NULL,
    user_nickname text NULL
    timestamps text NOT NULL,
    score float NOT NULL,
);

ALTER TABLE srtt_runs ADD PRIMARY KEY (id);

REVOKE ALL on public.srtt_runs from anon;
grant insert on public.srtt_runs to anon;

CREATE or replace VIEW srtt_highscores AS
SELECT score, nickname
FROM public.srtt_runs
order by score ASC;

REVOKE ALL on srtt_highscores from anon;
GRANT SELECT on srtt_highscores TO anon;
