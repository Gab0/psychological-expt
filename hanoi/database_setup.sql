 
create TABLE hanoi_runs
(
    id character varying NOT NULL,
    useragent character varying NULL,
    nickname character varying NULL,
    user_nickname text NULL,
    nb_disk integer NOT NULL,
    nb_move integer NOT NULL,
    elapsed_time double precision NULL,
    timestamps text null
);


ALTER TABLE hanoi_runs ADD PRIMARY KEY (id);


REVOKE ALL on public.hanoi_runs from anon;
grant insert on public.hanoi_runs to anon;

CREATE or replace VIEW hanoi_highscores AS
SELECT nb_disk, nb_move, elapsed_time, COALESCE(user_nickname, nickname) AS nickname
FROM public.hanoi_runs
order by elapsed_time ASC;

REVOKE ALL on hanoi_highscores from anon;
GRANT SELECT on hanoi_highscores TO anon;
