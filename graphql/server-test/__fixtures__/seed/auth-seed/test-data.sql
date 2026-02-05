-- Test data for auth-seed test scenario
-- Creates test users, tokens, and configures the RLS module

-- Use replica mode to bypass triggers/constraints during seed
SET session_replication_role TO replica;

-- Fixed UUIDs for test data
-- Using fixed UUIDs makes tests deterministic and easier to debug

-- Database ID (same as simple-seed-services)
-- 80a2eaaf-f77e-4bfe-8506-df929ef1b8d9

-- Insert test database (matching simple-seed-services format)
INSERT INTO metaschema_public.database (id, owner_id, name, hash)
VALUES (
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'auth-test-db',
  '425a0f10-0170-5760-85df-2a980c378224'
) ON CONFLICT (id) DO NOTHING;

-- Insert schemas into metaschema
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, label, is_public)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'auth-test-public', 'auth-test-public', 'Auth Test Public', true),
  ('a2222222-2222-2222-2222-222222222222', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'auth-test-private', 'auth-test-private', 'Auth Test Private', false)
ON CONFLICT (id) DO NOTHING;

-- Insert API
-- Note: dbname must use current_database() to match the dynamically created test database
INSERT INTO services_public.apis (id, database_id, name, dbname, role_name, anon_role, is_public)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'auth-test-api',
  current_database(),
  'authenticated',
  'anonymous',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert domain for the API
-- Note: URL parser sees "auth.test.constructive.io" as domain=constructive.io, subdomain=auth.test
INSERT INTO services_public.domains (id, database_id, api_id, subdomain, domain)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'b1111111-1111-1111-1111-111111111111',
  'auth.test',
  'constructive.io'
) ON CONFLICT (id) DO NOTHING;

-- Insert API schemas
INSERT INTO services_public.api_schemas (id, database_id, schema_id, api_id)
VALUES
  ('d1111111-1111-1111-1111-111111111111', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insert RLS module configuration
-- This links the API to the authenticate functions in auth-test-private schema
INSERT INTO metaschema_modules_public.rls_module (
  id,
  database_id,
  api_id,
  schema_id,
  private_schema_id,
  authenticate,
  authenticate_strict
)
VALUES (
  'e1111111-1111-1111-1111-111111111111',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'authenticate',
  'authenticate_strict'
) ON CONFLICT (id) DO NOTHING;

-- Insert test users
-- Note: UUIDs must use valid hex characters (0-9, a-f only)
INSERT INTO "auth-test-private".users (id, email, role)
VALUES
  ('01111111-1111-1111-1111-111111111111', 'admin@test.com', 'administrator'),
  ('02222222-2222-2222-2222-222222222222', 'user@test.com', 'authenticated'),
  ('03333333-3333-3333-3333-333333333333', 'guest@test.com', 'anonymous')
ON CONFLICT (id) DO NOTHING;

-- Insert test tokens
-- valid-admin-token: Valid token for admin user
INSERT INTO "auth-test-private".tokens (id, user_id, token, expires_at)
VALUES (
  '04111111-1111-1111-1111-111111111111',
  '01111111-1111-1111-1111-111111111111',
  'valid-admin-token',
  now() + interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- valid-user-token: Valid token for regular user
INSERT INTO "auth-test-private".tokens (id, user_id, token, expires_at)
VALUES (
  '04222222-2222-2222-2222-222222222222',
  '02222222-2222-2222-2222-222222222222',
  'valid-user-token',
  now() + interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- expired-token: Expired token
INSERT INTO "auth-test-private".tokens (id, user_id, token, expires_at)
VALUES (
  '04333333-3333-3333-3333-333333333333',
  '02222222-2222-2222-2222-222222222222',
  'expired-token',
  now() - interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Insert test items
INSERT INTO "auth-test-public".items (id, name, owner_id)
VALUES
  ('05111111-1111-1111-1111-111111111111', 'Admin Item', '01111111-1111-1111-1111-111111111111'),
  ('05222222-2222-2222-2222-222222222222', 'User Item', '02222222-2222-2222-2222-222222222222'),
  ('05333333-3333-3333-3333-333333333333', 'Public Item', NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset replication role
SET session_replication_role TO DEFAULT;
