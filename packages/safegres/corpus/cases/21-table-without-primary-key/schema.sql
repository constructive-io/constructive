DROP SCHEMA IF EXISTS c_no_pk CASCADE;
CREATE SCHEMA c_no_pk;
GRANT USAGE ON SCHEMA c_no_pk TO corpus_user, corpus_anon;

CREATE TABLE c_no_pk.click_events (
  -- The flaw: no primary key and no replica identity. Rows cannot be
  -- addressed individually, and logical replication of updates fails.
  session_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  path text
);
CREATE INDEX click_events_session_idx ON c_no_pk.click_events (session_id);

GRANT SELECT ON c_no_pk.click_events TO corpus_user;
