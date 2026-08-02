-- Minimal catalog state that the stack adapters key off. Not a real
-- PostgREST/Hasura/PostGraphile install: each adapter reads exactly one
-- catalog signal, and this fixture reproduces that signal.

-- PostgREST / Supabase: exposure is a GUC on the connecting role, which lands
-- in pg_db_role_setting. `anon` is the role an unauthenticated request runs as.
CREATE SCHEMA IF NOT EXISTS fx_pgrst_api;
CREATE SCHEMA IF NOT EXISTS fx_pgrst_private;

CREATE TABLE IF NOT EXISTS fx_pgrst_api.notes (id serial PRIMARY KEY, body text);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_anon') THEN
    CREATE ROLE fx_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fx_authenticator') THEN
    CREATE ROLE fx_authenticator NOLOGIN;
  END IF;
END
$$;

GRANT SELECT ON fx_pgrst_api.notes TO fx_anon;
ALTER ROLE fx_authenticator SET pgrst.db_schemas = 'fx_pgrst_api';
ALTER ROLE fx_authenticator SET pgrst.db_anon_role = 'fx_anon';

-- Hasura v2+: one JSON metadata document; only *tracked* tables are served.
CREATE SCHEMA IF NOT EXISTS hdb_catalog;
CREATE SCHEMA IF NOT EXISTS fx_hasura_api;
CREATE TABLE IF NOT EXISTS fx_hasura_api.articles (id serial PRIMARY KEY);
CREATE TABLE IF NOT EXISTS hdb_catalog.hdb_metadata (id integer PRIMARY KEY, metadata jsonb NOT NULL);
INSERT INTO hdb_catalog.hdb_metadata (id, metadata)
VALUES (
  1,
  '{"sources": [{"name": "default", "tables": [{"table": {"schema": "fx_hasura_api", "name": "articles"}}]}]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- graphile-starter layout: app_public served, app_hidden reachable through it,
-- app_private not exposed.
CREATE SCHEMA IF NOT EXISTS app_public;
CREATE SCHEMA IF NOT EXISTS app_hidden;
CREATE SCHEMA IF NOT EXISTS app_private;
CREATE TABLE IF NOT EXISTS app_public.posts (id serial PRIMARY KEY);
CREATE TABLE IF NOT EXISTS app_private.sessions (id serial PRIMARY KEY);
