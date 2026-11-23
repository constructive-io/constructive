-- CSRF on the REST routes: records which user each function invocation ran as,
-- so a test can tell a cookie-authenticated invocation from an anonymous one.
--
-- Compose after compute/setup.sql and auth-cookie/schema.sql.

ALTER TABLE compute_public.function_invocations
  ADD COLUMN actor_id uuid DEFAULT nullif(current_setting('jwt.claims.user_id', true), '')::uuid;

-- Agent modules at two entity scopes, so POST /v1/threads and
-- /v1/orgs/:entity_id/threads can create a thread; the thread's owner_id is
-- the user the request authenticated as.
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


-- A second entity scope with agents, as an entity type provisioned with agents
-- registers: its own thread table, keyed by the same entity column.
CREATE TABLE "simple-pets-agent-public".room_threads (LIKE "simple-pets-agent-public".threads INCLUDING ALL);
GRANT SELECT, INSERT ON "simple-pets-agent-public".room_threads TO authenticated;
ALTER TABLE "simple-pets-agent-public".room_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_threads_principal ON "simple-pets-agent-public".room_threads
  FOR ALL TO authenticated
  USING (owner_id = nullif(current_setting('jwt.claims.principal_id', true), '')::uuid)
  WITH CHECK (owner_id = nullif(current_setting('jwt.claims.principal_id', true), '')::uuid);

-- Each scope's memberships: which entities an actor belongs to. A member sees
-- only their own rows, so an entity they do not belong to resolves to no scope.
CREATE TABLE "simple-pets-agent-public".org_memberships (
  actor_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  PRIMARY KEY (actor_id, entity_id)
);
CREATE TABLE "simple-pets-agent-public".room_memberships (LIKE "simple-pets-agent-public".org_memberships INCLUDING ALL);
GRANT SELECT ON "simple-pets-agent-public".org_memberships, "simple-pets-agent-public".room_memberships TO authenticated;
ALTER TABLE "simple-pets-agent-public".org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simple-pets-agent-public".room_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_memberships_own ON "simple-pets-agent-public".org_memberships
  FOR SELECT TO authenticated
  USING (actor_id = nullif(current_setting('jwt.claims.principal_id', true), '')::uuid);
CREATE POLICY room_memberships_own ON "simple-pets-agent-public".room_memberships
  FOR SELECT TO authenticated
  USING (actor_id = nullif(current_setting('jwt.claims.principal_id', true), '')::uuid);

-- The session user is a member of their own personal entity (org scope) and of
-- one room; a second room belongs to somebody else.
INSERT INTO "simple-pets-agent-public".org_memberships (actor_id, entity_id)
VALUES ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002');
INSERT INTO "simple-pets-agent-public".room_memberships (actor_id, entity_id)
VALUES
  ('bbbbbbbb-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001'),
  ('dddddddd-0000-4000-8000-000000000009', 'cccccccc-0000-4000-8000-000000000002');

SET session_replication_role TO replica;

INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, is_public)
VALUES
  ('6dba0101-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'agent_public', 'simple-pets-agent-public', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.table (id, database_id, schema_id, name)
VALUES
  ('6dba0103-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001', 'threads'),
  ('6dba0103-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001', 'messages'),
  ('6dba0103-0000-4000-8000-000000000003', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001', 'room_threads')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.agent_module
  (id, database_id, schema_id, private_schema_id, scope, entity_field, thread_table_id, message_table_id)
VALUES
  ('6dba0102-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001',
   '6dba0101-0000-4000-8000-000000000001', 'org', 'entity_id',
   '6dba0103-0000-4000-8000-000000000001', '6dba0103-0000-4000-8000-000000000002'),
  ('6dba0102-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001',
   '6dba0101-0000-4000-8000-000000000001', 'room', 'entity_id',
   '6dba0103-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.memberships_module
  (id, database_id, schema_id, private_schema_id, scope, prefix, entity_field, memberships_table_name)
VALUES
  ('6dba0104-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001',
   '6dba0101-0000-4000-8000-000000000001', 'org', 'org', 'entity_id', 'org_memberships'),
  ('6dba0104-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0101-0000-4000-8000-000000000001',
   '6dba0101-0000-4000-8000-000000000001', 'room', 'room', 'entity_id', 'room_memberships')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
