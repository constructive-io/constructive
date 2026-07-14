-- Shared fixture: compute (functions) module DDL
--
-- Creates the minimum tables needed to emulate the compute module in a
-- production Constructive database: the metaschema module registration
-- tables (function_module, function_invocation_module) plus the generated
-- compute tables (function_definitions, function_api_bindings,
-- function_invocations).
--
-- The function_invocations INSERT policy mirrors the api arm of the
-- production policy: the row is only insertable when the transaction-local
-- `jwt.claims.api_id` claim matches the binding (`api_binding_id`) recorded
-- on the invocation and that binding points at the invocation's
-- `function_definition_id`.
--
-- Depends on: services/setup.sql

-- =====================================================
-- METASCHEMA MODULE REGISTRATION TABLES
-- =====================================================

-- The physical bindings table name is recorded on the module config row
-- (bindings_table_name) — consumers read it as a fact, never derive it.
CREATE TABLE IF NOT EXISTS metaschema_modules_public.function_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  definitions_table_name text NOT NULL DEFAULT 'function_definitions',
  bindings_table_name text NOT NULL DEFAULT 'function_api_bindings',
  scope text NOT NULL DEFAULT 'app'
);

-- entity_field records the invocations table's scope-key column: NULL for
-- global scopes (app/platform), 'database_id' for the database scope, or the
-- entity key column for entity scopes.
CREATE TABLE IF NOT EXISTS metaschema_modules_public.function_invocation_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  invocations_table_name text NOT NULL DEFAULT 'function_invocations',
  scope text NOT NULL DEFAULT 'app',
  entity_field text
);

GRANT SELECT ON metaschema_modules_public.function_module TO administrator, authenticated, anonymous;
GRANT SELECT ON metaschema_modules_public.function_invocation_module TO administrator, authenticated, anonymous;

-- =====================================================
-- COMPUTE SCHEMA + GENERATED TABLES
-- =====================================================

CREATE SCHEMA IF NOT EXISTS compute_public;
GRANT USAGE ON SCHEMA compute_public TO administrator, authenticated, anonymous;

-- task_identifier is a generated column = category || ':' || name, matching
-- the merged function_module generator (category:name, not scope:name). The
-- app scope is global, so the definitions table carries no scope-key column.
CREATE TABLE IF NOT EXISTS compute_public.function_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL,
  name text NOT NULL,
  task_identifier text GENERATED ALWAYS AS (category || ':' || name) STORED,
  description text,
  payload_args jsonb
);

CREATE TABLE IF NOT EXISTS compute_public.function_api_bindings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_definition_id uuid NOT NULL REFERENCES compute_public.function_definitions (id) ON DELETE CASCADE,
  api_id uuid NOT NULL,
  alias text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  UNIQUE (api_id, alias)
);

-- Invocations carry a hard FK to the definition (function_definition_id,
-- ON DELETE SET NULL) and to the binding they came through (api_binding_id).
-- The app scope is global, so there is no scope-key column.
CREATE TABLE IF NOT EXISTS compute_public.function_invocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_definition_id uuid REFERENCES compute_public.function_definitions (id) ON DELETE SET NULL,
  api_binding_id uuid REFERENCES compute_public.function_api_bindings (id),
  task_identifier text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int
);

GRANT SELECT ON compute_public.function_definitions TO administrator, authenticated, anonymous;
GRANT SELECT ON compute_public.function_api_bindings TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT ON compute_public.function_invocations TO administrator, authenticated, anonymous;

-- =====================================================
-- RLS — api-arm provenance policy
-- =====================================================

ALTER TABLE compute_public.function_invocations ENABLE ROW LEVEL SECURITY;

-- INSERT is only allowed when the invocation carries the binding
-- (api_binding_id) it came through, that binding belongs to the
-- server-injected jwt.claims.api_id, and it points at the same definition
-- recorded on the invocation (function_definition_id). Mirrors the merged
-- api provenance arm.
CREATE POLICY function_invocations_api_insert ON compute_public.function_invocations
  FOR INSERT TO administrator, authenticated, anonymous
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM compute_public.function_api_bindings b
      WHERE b.id = function_invocations.api_binding_id
        AND b.function_definition_id = function_invocations.function_definition_id
        AND b.api_id = nullif(current_setting('jwt.claims.api_id', true), '')::uuid
    )
  );

CREATE POLICY function_invocations_select ON compute_public.function_invocations
  FOR SELECT TO administrator, authenticated, anonymous
  USING (true);
