-- A2 seed: grants to a non-owner role on a table with RLS disabled.
-- Expected finding: A2 (high)

CREATE SCHEMA IF NOT EXISTS fx_a2;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_a2_reader') THEN
    CREATE ROLE fx_a2_reader NOLOGIN;
  END IF;
END $$;

CREATE TABLE fx_a2.widgets (
  id bigserial PRIMARY KEY,
  body text
);

GRANT SELECT, INSERT ON fx_a2.widgets TO fx_a2_reader;
-- RLS intentionally NOT enabled.
