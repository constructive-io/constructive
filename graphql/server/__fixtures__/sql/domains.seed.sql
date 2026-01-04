BEGIN;

-- Two databases
INSERT INTO collections_public.database (id, name) VALUES
  ('0b22e268-16d6-582b-950a-24e108688849', 'primary-db'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'secondary-db');

-- Public APIs
INSERT INTO meta_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('11111111-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', 'public-api', true, 'authenticated', 'anonymous'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'public-app', true, 'authenticated', 'anonymous');

-- Private API
INSERT INTO meta_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('33333333-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', 'admin-api', false, 'administrator', 'administrator');

-- Domain mappings
INSERT INTO meta_public.domains (id, database_id, api_id, domain, subdomain) VALUES
  ('44444444-4444-4444-4444-444444444444', '0b22e268-16d6-582b-950a-24e108688849', '11111111-1111-1111-1111-111111111111', 'example.com', 'api'),
  ('55555555-5555-5555-5555-555555555555', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-2222-2222-2222-222222222222', 'example.com', 'app'),
  ('66666666-6666-6666-6666-666666666666', '0b22e268-16d6-582b-950a-24e108688849', '33333333-3333-3333-3333-333333333333', 'example.com', 'admin'),
  ('77777777-7777-7777-7777-777777777777', '0b22e268-16d6-582b-950a-24e108688849', '11111111-1111-1111-1111-111111111111', 'example.com', NULL),
  ('88888888-8888-8888-8888-888888888888', '0b22e268-16d6-582b-950a-24e108688849', '11111111-1111-1111-1111-111111111111', 'example.com', 'www');

-- Schema extensions
INSERT INTO meta_public.api_extensions (id, database_id, api_id, schema_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0b22e268-16d6-582b-950a-24e108688849', '11111111-1111-1111-1111-111111111111', 'collections_public'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '0b22e268-16d6-582b-950a-24e108688849', '11111111-1111-1111-1111-111111111111', 'meta_public'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-2222-2222-2222-222222222222', 'collections_public'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-2222-2222-2222-222222222222', 'meta_public'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '0b22e268-16d6-582b-950a-24e108688849', '33333333-3333-3333-3333-333333333333', 'collections_public'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '0b22e268-16d6-582b-950a-24e108688849', '33333333-3333-3333-3333-333333333333', 'meta_public');

COMMIT;
