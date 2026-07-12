-- Minimal compute tables for function bindings plugin tests.
CREATE SCHEMA fn_test;

CREATE TABLE fn_test.function_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid,
  task_identifier text NOT NULL,
  description text,
  payload_args jsonb
);

CREATE TABLE fn_test.function_api_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_definition_id uuid NOT NULL REFERENCES fn_test.function_definitions (id),
  api_id uuid NOT NULL,
  alias text NOT NULL,
  config jsonb
);

CREATE TABLE fn_test.function_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  database_id uuid NOT NULL,
  task_identifier text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending'
);

INSERT INTO fn_test.function_definitions (id, database_id, task_identifier, description, payload_args) VALUES
  ('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'images:resize',
   'Resize an image', '[{"name": "url", "type": "text"}, {"name": "width", "type": "int"}]'),
  ('22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'emails:send',
   NULL, '[]'),
  ('33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'internal:secret',
   NULL, '[]'),
  ('44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'orders:validate',
   NULL, '[]');

INSERT INTO fn_test.function_api_bindings (function_definition_id, api_id, alias, config) VALUES
  -- payload_args-derived input
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'resize_image', '{"graphql": true}'),
  -- fallback JSON payload input
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'send_email', '{}'),
  -- graphql-disabled binding must not be exposed
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'secret_fn', '{"graphql": false}'),
  -- JSON-Schema-derived input (enum + required)
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'validate_order',
   '{"schema": {"type": "object", "required": ["mode"], "properties": {"mode": {"type": "string", "enum": ["fast", "slow"]}, "count": {"type": "integer"}}}}'),
  -- binding for a different api must not be exposed
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'other_api_fn', NULL);
