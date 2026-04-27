-- A3 seed: RLS enabled but not FORCE'd, with at least one policy so A1 doesn't trigger.
-- Expected finding: A3 (medium)

CREATE SCHEMA IF NOT EXISTS fx_a3;

CREATE TABLE fx_a3.notes (
  id bigserial PRIMARY KEY,
  body text,
  owner_id uuid
);

ALTER TABLE fx_a3.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select ON fx_a3.notes
  FOR SELECT USING (true);
