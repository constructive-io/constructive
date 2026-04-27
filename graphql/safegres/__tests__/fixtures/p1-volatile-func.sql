-- P1 seed: policy references a user-defined VOLATILE function.
-- Expected finding: P1 (high) — per-row evaluation.

CREATE SCHEMA IF NOT EXISTS fx_p1;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_p1_user') THEN
    CREATE ROLE fx_p1_user NOLOGIN;
  END IF;
END $$;

CREATE FUNCTION fx_p1.slow_auth_lookup() RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$ SELECT gen_random_uuid() $$;

CREATE TABLE fx_p1.records (
  id bigserial PRIMARY KEY,
  owner_id uuid
);

ALTER TABLE fx_p1.records ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON fx_p1.records TO fx_p1_user;

CREATE POLICY records_select ON fx_p1.records
  FOR SELECT TO fx_p1_user
  USING (owner_id = fx_p1.slow_auth_lookup());
