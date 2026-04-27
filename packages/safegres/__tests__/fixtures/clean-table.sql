-- Baseline: correctly-configured table with RLS + FORCE + grants covered by
-- non-trivial policies.
-- Expected findings: none.

CREATE SCHEMA IF NOT EXISTS fx_clean;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_clean_user') THEN
    CREATE ROLE fx_clean_user NOLOGIN;
  END IF;
END $$;

CREATE TABLE fx_clean.items (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  body text
);

ALTER TABLE fx_clean.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_clean.items FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON fx_clean.items TO fx_clean_user;

-- Non-trivial policies gated on the row owner column.
CREATE POLICY items_select ON fx_clean.items
  FOR SELECT TO fx_clean_user
  USING (owner_id IS NOT NULL);

CREATE POLICY items_insert ON fx_clean.items
  FOR INSERT TO fx_clean_user
  WITH CHECK (owner_id IS NOT NULL);

CREATE POLICY items_update ON fx_clean.items
  FOR UPDATE TO fx_clean_user
  USING (owner_id IS NOT NULL) WITH CHECK (owner_id IS NOT NULL);
