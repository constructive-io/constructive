-- Shared fixture: compute (functions) module test data
--
-- Registers the compute_public schema in the metaschema, provisions the
-- function/invocation modules, and seeds one function definition with two
-- API bindings on the "app" API (6c9997a4-591b-4cb3-9313-4ef45d6f134e):
--   - alias "resize"       → rest enabled  ({"rest": {"path": "/resize", "methods": ["POST"]}})
--   - alias "graphql-only" → rest disabled (absent "rest" key)
--
-- Depends on: services/setup.sql, services/test-data.sql, compute/setup.sql

SET session_replication_role TO replica;

-- Register compute_public in the metaschema
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
VALUES (
  '9dba0001-0000-4000-8000-000000000001',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'compute_public',
  'compute_public',
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Module registrations (what the compute loader resolves)
INSERT INTO metaschema_modules_public.function_module (id, database_id, schema_id, definitions_table_name, scope)
VALUES (
  '9dba0002-0000-4000-8000-000000000002',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '9dba0001-0000-4000-8000-000000000001',
  'function_definitions',
  'app'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.function_invocation_module (id, database_id, schema_id, invocations_table_name, scope)
VALUES (
  '9dba0003-0000-4000-8000-000000000003',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '9dba0001-0000-4000-8000-000000000001',
  'function_invocations',
  'app'
) ON CONFLICT (id) DO NOTHING;

-- Function definition
INSERT INTO compute_public.function_definitions (id, database_id, name, task_identifier)
VALUES (
  '9dba0004-0000-4000-8000-000000000004',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'resize-image',
  'app/resize_image'
) ON CONFLICT (id) DO NOTHING;

-- Bindings on the "app" API
INSERT INTO compute_public.function_api_bindings (id, function_definition_id, api_id, alias, config)
VALUES
  (
    '9dba0005-0000-4000-8000-000000000005',
    '9dba0004-0000-4000-8000-000000000004',
    '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
    'resize',
    '{"graphql": true, "rest": {"path": "/resize", "methods": ["POST"]}}'
  ),
  (
    '9dba0006-0000-4000-8000-000000000006',
    '9dba0004-0000-4000-8000-000000000004',
    '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
    'graphql-only',
    '{"graphql": true}'
  )
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
