-- Two ways into the same database: an API schema, and an internal schema a
-- reporting role holds a direct grant on. The internal leak is invisible to
-- the API surface and is exactly what a role plane is for.

CREATE SCHEMA IF NOT EXISTS fx_pl_api;
CREATE SCHEMA IF NOT EXISTS fx_pl_internal;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_pl_anon') THEN
    CREATE ROLE fx_pl_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_pl_reporting') THEN
    CREATE ROLE fx_pl_reporting NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_pl_admin') THEN
    CREATE ROLE fx_pl_admin NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA fx_pl_api TO fx_pl_anon;
GRANT USAGE ON SCHEMA fx_pl_internal TO fx_pl_reporting;

CREATE TABLE fx_pl_api.posts (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  body text
);
ALTER TABLE fx_pl_api.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_select ON fx_pl_api.posts FOR SELECT TO fx_pl_anon
  USING (owner_id = current_setting('jwt.claims.user_id', true)::uuid);
GRANT SELECT ON fx_pl_api.posts TO fx_pl_anon;

-- RLS off, granted directly: an A2 the API never sees.
CREATE TABLE fx_pl_internal.ledger (
  id bigserial PRIMARY KEY,
  amount numeric
);
GRANT SELECT, UPDATE ON fx_pl_internal.ledger TO fx_pl_reporting;
