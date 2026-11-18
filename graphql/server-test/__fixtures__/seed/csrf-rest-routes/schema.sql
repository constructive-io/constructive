-- CSRF on the REST routes: records which user each function invocation ran as,
-- so a test can tell a cookie-authenticated invocation from an anonymous one.
--
-- Compose after compute/setup.sql and auth-cookie/schema.sql.

ALTER TABLE compute_public.function_invocations
  ADD COLUMN actor_id uuid DEFAULT nullif(current_setting('jwt.claims.user_id', true), '')::uuid;

-- An org-scope agent module so POST /v1/threads can create a thread; the
-- thread's owner_id is the user the request authenticated as.
CREATE SCHEMA "simple-pets-agent-public";
GRANT USAGE ON SCHEMA "simple-pets-agent-public" TO administrator, authenticated, anonymous;

CREATE TABLE "simple-pets-agent-public".threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  mode text NOT NULL,
  model text,
  system_prompt text,
  title text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON "simple-pets-agent-public".threads TO authenticated;

-- The generated agent tables admit a row by the acting principal
-- (jwt_public.current_principal_id()), not by jwt.claims.user_id: a request
-- that carries no principal claim is refused by row-level security.
ALTER TABLE "simple-pets-agent-public".threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY threads_principal ON "simple-pets-agent-public".threads
  FOR ALL TO authenticated
  USING (owner_id = nullif(current_setting('jwt.claims.principal_id', true), '')::uuid)
  WITH CHECK (owner_id = nullif(current_setting('jwt.claims.principal_id', true), '')::uuid);

SET session_replication_role TO replica;

INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, is_public)
VALUES
  ('6dba0101-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'agent_public', 'simple-pets-agent-public', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.table (id, database_id, schema_id, name)
VALUES
  ('6dba0103-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001', 'threads'),
  ('6dba0103-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001', 'messages')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.agent_module
  (id, database_id, schema_id, private_schema_id, scope, entity_field, thread_table_id, message_table_id)
VALUES
  ('6dba0102-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001',
   '6dba0101-0000-4000-8000-000000000001', 'org', 'entity_id',
   '6dba0103-0000-4000-8000-000000000001', '6dba0103-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
