-- Tenant shared-session SSO routing fixture.
--
-- Auth, API1, and API2 are distinct API surfaces in database A. The "other"
-- API is resolvable by the same routing plane but belongs to database B. OAuth
-- redirect validation must trust only the first three as database-A targets.

SET session_replication_role TO replica;

INSERT INTO metaschema_public.database (id, owner_id, name, hash)
VALUES (
  '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'other-tenant',
  '525a0f10-0170-5760-85df-2a980c378224'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.schema (
  id,
  database_id,
  name,
  schema_name,
  description,
  is_public
)
VALUES (
  '9dbae92a-5450-401b-1ed5-d69e7754940d',
  '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'public',
  'other-tenant-public',
  NULL,
  true
)
ON CONFLICT (id) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS "other-tenant-public";
GRANT USAGE ON SCHEMA "other-tenant-public"
  TO administrator, authenticated, anonymous;

-- API1 exposes only simple-pets-public; API2 exposes the animals schema.
INSERT INTO routing_public.api_schemas (id, database_id, schema_id, api_id)
VALUES
  (
    '7a181146-890e-4991-9da7-3dddf87d9e01',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '6dbae92a-5450-401b-1ed5-d69e7754940d',
    '28199444-da40-40b1-8a4c-53edbf91c738'
  ),
  (
    '7a181146-890e-4991-9da7-3dddf87d9e02',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
    'cc1e8389-e69d-4e12-9089-a98bf11fc75f'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_public.apis (
  id,
  owner_scope,
  owner_key,
  is_visible,
  database_id,
  name,
  dbname,
  role_name,
  anon_role,
  config
)
VALUES (
  '9c9997a4-591b-4cb3-9313-4ef45d6f134e',
  'database',
  '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  true,
  '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'other',
  current_database(),
  'authenticated',
  'anonymous',
  jsonb_build_object(
    'api_id', '9c9997a4-591b-4cb3-9313-4ef45d6f134e',
    'database_id', '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'is_public', true,
    'schemas', jsonb_build_array('other-tenant-public')
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.apis (
  id,
  database_id,
  name,
  dbname,
  role_name,
  anon_role,
  is_published
)
VALUES (
  '9c9997a4-591b-4cb3-9313-4ef45d6f134e',
  '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'other',
  current_database(),
  'authenticated',
  'anonymous',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.api_schemas (id, database_id, schema_id, api_id)
VALUES (
  '7a181146-890e-4991-9da7-3dddf87d9e03',
  '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '9dbae92a-5450-401b-1ed5-d69e7754940d',
  '9c9997a4-591b-4cb3-9313-4ef45d6f134e'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_public.domains (
  id,
  owner_scope,
  owner_key,
  is_visible,
  database_id,
  hostname,
  is_wildcard,
  parent_hostname,
  managed,
  verification_status,
  tls_status
)
VALUES
  (
    '4a181146-890e-4991-9da7-3dddf87d9e01',
    'database',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    true,
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'auth.tenanta.test',
    false,
    NULL,
    false,
    'verified',
    'ready'
  ),
  (
    '4a181146-890e-4991-9da7-3dddf87d9e02',
    'database',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    true,
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'api1.tenanta.test',
    false,
    NULL,
    false,
    'verified',
    'ready'
  ),
  (
    '4a181146-890e-4991-9da7-3dddf87d9e03',
    'database',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    true,
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'api2.tenanta.test',
    false,
    NULL,
    false,
    'verified',
    'ready'
  ),
  (
    '4a181146-890e-4991-9da7-3dddf87d9e04',
    'database',
    '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    true,
    '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'api.other.test',
    false,
    NULL,
    false,
    'verified',
    'ready'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.domains (
  id,
  database_id,
  hostname,
  managed,
  is_wildcard,
  parent_hostname,
  verification_status,
  tls_status,
  tls_secret_name,
  is_published
)
VALUES
  (
    '4a181146-890e-4991-9da7-3dddf87d9e01',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'auth.tenanta.test',
    false,
    false,
    NULL,
    'verified',
    'ready',
    NULL,
    true
  ),
  (
    '4a181146-890e-4991-9da7-3dddf87d9e02',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'api1.tenanta.test',
    false,
    false,
    NULL,
    'verified',
    'ready',
    NULL,
    true
  ),
  (
    '4a181146-890e-4991-9da7-3dddf87d9e03',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'api2.tenanta.test',
    false,
    false,
    NULL,
    'verified',
    'ready',
    NULL,
    true
  ),
  (
    '4a181146-890e-4991-9da7-3dddf87d9e04',
    '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    'api.other.test',
    false,
    false,
    NULL,
    'verified',
    'ready',
    NULL,
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.routes (
  id,
  database_id,
  domain_id,
  target_api_id,
  path,
  method,
  priority,
  is_active
)
VALUES
  (
    '9a181146-890e-4991-9da7-3dddf87d9e01',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '4a181146-890e-4991-9da7-3dddf87d9e01',
    '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
    '/',
    NULL,
    0,
    true
  ),
  (
    '9a181146-890e-4991-9da7-3dddf87d9e02',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '4a181146-890e-4991-9da7-3dddf87d9e02',
    '28199444-da40-40b1-8a4c-53edbf91c738',
    '/',
    NULL,
    0,
    true
  ),
  (
    '9a181146-890e-4991-9da7-3dddf87d9e03',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '4a181146-890e-4991-9da7-3dddf87d9e03',
    'cc1e8389-e69d-4e12-9089-a98bf11fc75f',
    '/',
    NULL,
    0,
    true
  ),
  (
    '9a181146-890e-4991-9da7-3dddf87d9e04',
    '90a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '4a181146-890e-4991-9da7-3dddf87d9e04',
    '9c9997a4-591b-4cb3-9313-4ef45d6f134e',
    '/',
    NULL,
    0,
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.hostname_bindings (
  id,
  hostname,
  domain_id,
  is_wildcard,
  parent_hostname,
  managed,
  verification_status,
  tls_status,
  tls_secret_name,
  updated_at
)
SELECT
  (md5(concat(id::text, '|', hostname)))::uuid,
  hostname,
  id,
  false,
  NULL,
  false,
  'verified',
  'ready',
  NULL,
  now()
FROM routing_public.domains
WHERE hostname IN (
  'auth.tenanta.test',
  'api1.tenanta.test',
  'api2.tenanta.test',
  'api.other.test'
)
ON CONFLICT (hostname) DO NOTHING;

INSERT INTO routing_public.route_bindings (
  id,
  domain_id,
  target_api_id,
  target_site_id,
  target_function_id,
  path,
  method,
  priority,
  is_active,
  updated_at
)
SELECT
  id,
  domain_id,
  target_api_id,
  NULL,
  NULL,
  path,
  method,
  priority,
  is_active,
  now()
FROM routing_public.routes
WHERE id IN (
  '9a181146-890e-4991-9da7-3dddf87d9e01',
  '9a181146-890e-4991-9da7-3dddf87d9e02',
  '9a181146-890e-4991-9da7-3dddf87d9e03',
  '9a181146-890e-4991-9da7-3dddf87d9e04'
)
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
