-- A6 seed: UPDATE policy with USING but no WITH CHECK.
-- Expected finding: A6 (high)

CREATE SCHEMA IF NOT EXISTS fx_a6;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_a6_editor') THEN
    CREATE ROLE fx_a6_editor NOLOGIN;
  END IF;
END $$;

CREATE TABLE fx_a6.docs (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  body text
);

ALTER TABLE fx_a6.docs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON fx_a6.docs TO fx_a6_editor;

CREATE POLICY docs_update ON fx_a6.docs
  FOR UPDATE TO fx_a6_editor
  USING (true);
-- missing WITH CHECK — rows can be moved out of the visible set.

CREATE POLICY docs_select ON fx_a6.docs
  FOR SELECT TO fx_a6_editor USING (true);
