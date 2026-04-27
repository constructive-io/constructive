-- A4 seed: INSERT grant to a role, but only a SELECT policy exists for that role.
-- Expected findings: A4 (high), and the INSERT will fail at runtime.

CREATE SCHEMA IF NOT EXISTS fx_a4;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_a4_writer') THEN
    CREATE ROLE fx_a4_writer NOLOGIN;
  END IF;
END $$;

CREATE TABLE fx_a4.events (
  id bigserial PRIMARY KEY,
  body text,
  owner_id uuid
);

ALTER TABLE fx_a4.events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON fx_a4.events TO fx_a4_writer;

CREATE POLICY events_select ON fx_a4.events
  FOR SELECT TO fx_a4_writer
  USING (true);
-- No INSERT policy for fx_a4_writer.
