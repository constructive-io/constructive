BEGIN;

-- APIs with schema edge cases for schema-validation tests.
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0b22e268-16d6-582b-950a-24e108688849', 'partial-invalid', true, 'authenticated', 'anonymous'),
  ('99999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '0b22e268-16d6-582b-950a-24e108688849', 'no-valid', true, 'authenticated', 'anonymous'),
  ('99999999-cccc-cccc-cccc-cccccccccccc', '0b22e268-16d6-582b-950a-24e108688849', 'empty-schemas', true, 'authenticated', 'anonymous');

INSERT INTO services_public.domains (id, database_id, api_id, domain, subdomain) VALUES
  ('dddddddd-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'example.com', 'partial'),
  ('dddddddd-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '99999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'example.com', 'novalid'),
  ('dddddddd-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '99999999-cccc-cccc-cccc-cccccccccccc', 'example.com', 'empty');

INSERT INTO services_public.api_extensions (id, database_id, api_id, schema_name) VALUES
  ('eeeeeeee-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'app_public'),
  ('eeeeeeee-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'missing_schema'),
  ('eeeeeeee-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '99999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'missing_schema');

COMMIT;
