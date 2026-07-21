-- Shared fixture: compute (functions) module test data
--
-- Registers the compute_public schema in the metaschema, provisions the
-- function/invocation modules, and seeds one function definition with two
-- API bindings on the "app" API (6c9997a4-591b-4cb3-9313-4ef45d6f134e):
--   - alias "resize"         → rest enabled, payload_args-derived GraphQL input
--   - alias "graphql-only"   → rest disabled (absent "rest" key)
--   - alias "send_email"     → fallback JSON payload GraphQL input
--   - alias "secret_fn"      → graphql disabled (must not be exposed)
--   - alias "validate_order" → JSON-Schema-derived GraphQL input (enum + required)
-- plus one binding on the "public" API (28199444-da40-40b1-8a4c-53edbf91c738)
-- that must not be exposed on the "app" API.
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
INSERT INTO metaschema_modules_public.function_module (id, database_id, schema_id, definitions_table_name, bindings_table_name, scope)
VALUES (
  '9dba0002-0000-4000-8000-000000000002',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '9dba0001-0000-4000-8000-000000000001',
  'function_definitions',
  'function_api_bindings',
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

-- Function definitions (task_identifier is generated = category || ':' || name)
INSERT INTO compute_public.function_definitions (id, category, name, description, payload_args)
VALUES
  (
    '9dba0004-0000-4000-8000-000000000004',
    'app',
    'resize_image',
    'Resize an image',
    '[{"name": "url", "type": "text"}, {"name": "width", "type": "int"}]'
  ),
  (
    '9dba0007-0000-4000-8000-000000000007',
    'app',
    'send_email',
    NULL,
    '[]'
  ),
  (
    '9dba0008-0000-4000-8000-000000000008',
    'app',
    'secret_fn',
    NULL,
    '[]'
  ),
  (
    '9dba0009-0000-4000-8000-000000000009',
    'app',
    'validate_order',
    NULL,
    '[]'
  )
ON CONFLICT (id) DO NOTHING;

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
  ),
  (
    '9dba000a-0000-4000-8000-00000000000a',
    '9dba0007-0000-4000-8000-000000000007',
    '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
    'send_email',
    '{}'
  ),
  (
    '9dba000b-0000-4000-8000-00000000000b',
    '9dba0008-0000-4000-8000-000000000008',
    '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
    'secret_fn',
    '{"graphql": false}'
  ),
  (
    '9dba000c-0000-4000-8000-00000000000c',
    '9dba0009-0000-4000-8000-000000000009',
    '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
    'validate_order',
    '{"schema": {"type": "object", "required": ["mode"], "properties": {"mode": {"type": "string", "enum": ["fast", "slow"]}, "count": {"type": "integer"}}}}'
  ),
  (
    '9dba000d-0000-4000-8000-00000000000d',
    '9dba0004-0000-4000-8000-000000000004',
    '28199444-da40-40b1-8a4c-53edbf91c738',
    'other_api_fn',
    '{"graphql": true}'
  )
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
