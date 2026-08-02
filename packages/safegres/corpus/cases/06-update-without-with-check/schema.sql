DROP SCHEMA IF EXISTS c_update_no_check CASCADE;
CREATE SCHEMA c_update_no_check;
GRANT USAGE ON SCHEMA c_update_no_check TO corpus_user, corpus_anon;

CREATE TABLE c_update_no_check.tasks (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text
);
CREATE INDEX tasks_owner_idx ON c_update_no_check.tasks (owner_id);
ALTER TABLE c_update_no_check.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_update_no_check.tasks FORCE ROW LEVEL SECURITY;

-- The flaw: USING controls which rows may be updated; without WITH CHECK
-- the new row is unchecked, so a caller can reassign owner_id to someone else.
CREATE POLICY tasks_update ON c_update_no_check.tasks FOR UPDATE TO corpus_user
  USING (owner_id = (SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid));

GRANT UPDATE ON c_update_no_check.tasks TO corpus_user;
