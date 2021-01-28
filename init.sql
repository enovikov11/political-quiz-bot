create table updates (
    bot_id integer unique,
    update_id integer primary key,
    json_value text,
    created_at timestamp,
    processed_at timestamp
);