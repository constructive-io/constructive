BEGIN;

-- Three separate databases + one unavailable database entry
INSERT INTO collections_public.database (id, name) VALUES
  ('0b22e268-16d6-582b-950a-24e108688849', 'primary-db'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'secondary-db'),
  ('f1e2d3c4-b5a6-7890-1234-567890abcdef', 'tertiary-db'),
  ('99999999-9999-9999-9999-999999999999', 'unavailable-db');

-- APIs pointing to different databases
INSERT INTO meta_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('11111111-2222-3333-4444-555555555555', '0b22e268-16d6-582b-950a-24e108688849', 'primary-api', true, 'authenticated', 'anonymous'),
  ('22222222-3333-4444-5555-666666666666', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'secondary-api', true, 'authenticated', 'anonymous'),
  ('33333333-4444-5555-6666-777777777777', 'f1e2d3c4-b5a6-7890-1234-567890abcdef', 'tertiary-api', true, 'authenticated', 'anonymous');

INSERT INTO meta_public.apis (id, database_id, name, dbname, is_public, role_name, anon_role) VALUES
  ('44444444-5555-6666-7777-888888888888', '99999999-9999-9999-9999-999999999999', 'unavailable-api', 'missing_db', true, 'authenticated', 'anonymous');

-- Domain mappings
INSERT INTO meta_public.domains (id, database_id, api_id, domain, subdomain) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '0b22e268-16d6-582b-950a-24e108688849', '11111111-2222-3333-4444-555555555555', 'example.com', 'primary'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-3333-4444-5555-666666666666', 'example.com', 'secondary'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'f1e2d3c4-b5a6-7890-1234-567890abcdef', '33333333-4444-5555-6666-777777777777', 'example.com', 'tertiary'),
  ('aaaaaaaa-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999999', '44444444-5555-6666-7777-888888888888', 'example.com', 'unavailable');

-- Schema extensions for each API
INSERT INTO meta_public.api_extensions (id, database_id, api_id, schema_name) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', '0b22e268-16d6-582b-950a-24e108688849', '11111111-2222-3333-4444-555555555555', 'app_public'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-3333-4444-5555-666666666666', 'app_public'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'f1e2d3c4-b5a6-7890-1234-567890abcdef', '33333333-4444-5555-6666-777777777777', 'app_public'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999999', '44444444-5555-6666-7777-888888888888', 'app_public');

COMMIT;
