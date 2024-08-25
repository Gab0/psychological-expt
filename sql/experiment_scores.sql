

drop table experiment_run;
create TABLE experiment_run
(
    run_id character varying NOT NULL,
    user_id character varying NOT NULL,
    nickname character varying NULL,
    experiment_payload jsonb NOT NULL,
    experiment_id character varying NOT NULL,
    useragent character varying NULL,
    db_timestamp timestamp NOT NULL
);

ALTER TABLE experiment_run ADD PRIMARY KEY (run_id);


REVOKE ALL on public.experiment_run from anon;
drop function update_experiment_run;

CREATE OR REPLACE FUNCTION update_experiment_run(
    run_id varchar,
    user_id varchar,
    nickname text,
    experiment_payload jsonb,
    experiment_id text,
    useragent text
)
RETURNS VOID AS $$
#variable_conflict use_column
BEGIN
    INSERT INTO public.experiment_run (run_id, user_id, nickname, experiment_payload, experiment_id, useragent, db_timestamp)
    VALUES (run_id, user_id, nickname, experiment_payload, experiment_id, useragent, now())
    ON CONFLICT (run_id)
    DO UPDATE set
        run_id = EXCLUDED.run_id,
        user_id = EXCLUDED.user_id,
        nickname = EXCLUDED.nickname,
        experiment_payload = EXCLUDED.experiment_payload,
        experiment_id = EXCLUDED.experiment_id,
        useragent = EXCLUDED.useragent,
        db_timestamp = now();
END;
$$ LANGUAGE plpgsql security definer;


grant EXECUTE on function update_experiment_run to anon;


CREATE OR REPLACE FUNCTION view_experiment_runs(experiment_id text)
RETURNS SETOF experiment_run AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.experiment_run
    WHERE experiment_id = experiment_id;
END;
$$ LANGUAGE plpgsql security definer;

grant execute on function view_experiment_runs to anon;

