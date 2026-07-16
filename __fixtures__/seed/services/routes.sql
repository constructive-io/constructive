-- Shared fixture: Stage B HTTP routes for the app.test.constructive.io domain
--
-- Exercises services_public.resolve_http_route against the app domain seeded in
-- services/test-data.sql. Routes are intentionally scoped so that /graphql has
-- NO route (proving legacy host->api fallthrough still serves GraphQL), while a
-- site prefix and a webhook function route demonstrate typed dispatch.
--
-- Depends on: services/setup.sql, services/test-data.sql

SET session_replication_role TO replica;

-- site target at a specific prefix (NOT '/', so it never shadows /graphql)
INSERT INTO services_public.http_routes
  (id, database_id, domain_id, path, method, target_kind, target_id, priority)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '41181146-890e-4991-9da7-3dddf87d9e78',
  '/welcome',
  NULL,
  'site',
  '90000000-0000-4000-8000-000000000001',
  0
) ON CONFLICT (id) DO NOTHING;

-- function target for a specific POST path
INSERT INTO services_public.http_routes
  (id, database_id, domain_id, path, method, target_kind, target_id, priority)
VALUES (
  'a0000000-0000-4000-8000-000000000002',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '41181146-890e-4991-9da7-3dddf87d9e78',
  '/hooks/stripe',
  'POST',
  'function',
  '90000000-0000-4000-8000-000000000002',
  0
) ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
