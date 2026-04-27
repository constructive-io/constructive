-- P5 seed: policy references current_user for tenant gating.
-- Expected finding: P5 (high).

CREATE SCHEMA IF NOT EXISTS fx_p5;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_p5_user') THEN
    CREATE ROLE fx_p5_user NOLOGIN;
  END IF;
END $$;

CREATE TABLE fx_p5.items (
  id bigserial PRIMARY KEY,
  owner_name name
);

ALTER TABLE fx_p5.items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON fx_p5.items TO fx_p5_user;

CREATE POLICY items_select ON fx_p5.items
  FOR SELECT TO fx_p5_user
  USING (owner_name = current_user);
