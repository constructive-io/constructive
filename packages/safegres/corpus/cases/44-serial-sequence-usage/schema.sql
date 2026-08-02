DROP SCHEMA IF EXISTS c_seq_serial CASCADE;
CREATE SCHEMA c_seq_serial;

GRANT USAGE ON SCHEMA c_seq_serial TO corpus_anon, corpus_user;

-- The load-bearing shape: `tickets.id` is a `serial`, so the sequence backs a
-- real insert path and USAGE on it is a prerequisite for writing the table,
-- not an ornament. corpus_anon holds that USAGE. Whether it is gratuitous or
-- required depends on a write path the ACL alone does not show, which is
-- exactly why the finding must carry the OWNED BY link and must not turn into
-- a revoke recommendation.
CREATE TABLE c_seq_serial.tickets (
  id bigserial PRIMARY KEY,
  subject text NOT NULL
);
ALTER TABLE c_seq_serial.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_seq_serial.tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY tickets_own ON c_seq_serial.tickets
  FOR ALL TO corpus_user
  USING (subject = (SELECT current_setting('app.subject', true)))
  WITH CHECK (subject = (SELECT current_setting('app.subject', true)));
CREATE INDEX tickets_subject_idx ON c_seq_serial.tickets (subject);

GRANT SELECT, INSERT ON c_seq_serial.tickets TO corpus_user;
GRANT USAGE ON SEQUENCE c_seq_serial.tickets_id_seq TO corpus_anon;
