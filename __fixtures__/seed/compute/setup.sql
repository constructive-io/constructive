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
-- `jwt.claims.api_id` claim matches a binding for the invoked function.
--
-- Depends on: services/setup.sql

-- =====================================================
-- METASCHEMA MODULE REGISTRATION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS metaschema_modules_public.function_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  definitions_table_name text NOT NULL DEFAULT 'function_definitions',
  scope text NOT NULL DEFAULT 'app'
);

CREATE TABLE IF NOT EXISTS metaschema_modules_public.function_invocation_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  invocations_table_name text NOT NULL DEFAULT 'function_invocations',
  scope text NOT NULL DEFAULT 'app'
);

GRANT SELECT ON metaschema_modules_public.function_module TO administrator, authenticated, anonymous;
GRANT SELECT ON metaschema_modules_public.function_invocation_module TO administrator, authenticated, anonymous;

-- =====================================================
-- COMPUTE SCHEMA + GENERATED TABLES
-- =====================================================

CREATE SCHEMA IF NOT EXISTS compute_public;
GRANT USAGE ON SCHEMA compute_public TO administrator, authenticated, anonymous;

CREATE TABLE IF NOT EXISTS compute_public.function_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  name text NOT NULL,
  task_identifier text NOT NULL,
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

CREATE TABLE IF NOT EXISTS compute_public.function_invocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
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

-- INSERT is only allowed when the server-injected jwt.claims.api_id claim
-- matches a binding for the invoked function (api provenance arm).
CREATE POLICY function_invocations_api_insert ON compute_public.function_invocations
  FOR INSERT TO administrator, authenticated, anonymous
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM compute_public.function_api_bindings b
      JOIN compute_public.function_definitions d ON d.id = b.function_definition_id
      WHERE d.task_identifier = function_invocations.task_identifier
        AND b.api_id = nullif(current_setting('jwt.claims.api_id', true), '')::uuid
    )
  );

CREATE POLICY function_invocations_select ON compute_public.function_invocations
  FOR SELECT TO administrator, authenticated, anonymous
  USING (true);
