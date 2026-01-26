-- Test data
INSERT INTO "simple-pets-pets-public".animals (name, species) VALUES
  ('Max', 'Dog'), ('Whiskers', 'Cat'), ('Buddy', 'Dog'), ('Luna', 'Cat'), ('Charlie', 'Bird');

-- Explicit grants (ALTER DEFAULT PRIVILEGES doesn't apply in test context)
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator, authenticated, anonymous;



-- Admin access for meta schemas
GRANT USAGE ON SCHEMA metaschema_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_public TO administrator;
GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_modules_public TO administrator;

-- Admin access for services schema (required for API lookup via GraphQL)
GRANT USAGE ON SCHEMA services_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA services_public TO administrator;



-- Services API wiring for integration tests
UPDATE services_public.apis
SET dbname = current_database()
WHERE database_id = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

-- Domain for public API (app.test.constructive.io)
INSERT INTO services_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES (
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  'constructive.io',
  'app.test'
) ON CONFLICT (subdomain, domain)
DO UPDATE SET api_id = EXCLUDED.api_id;

-- Domain for private API (private.test.constructive.io)
INSERT INTO services_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES (
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'e257c53d-6ba6-40de-b679-61b37188a316',
  'constructive.io',
  'private.test'
) ON CONFLICT (subdomain, domain)
DO UPDATE SET api_id = EXCLUDED.api_id;

-- API schemas for public API
INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
) VALUES
(uuid_generate_v4(), '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6d264733-40be-4214-0c97-c3dbe8ba3b05', '6c9997a4-591b-4cb3-9313-4ef45d6f134e'),
(uuid_generate_v4(), '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6d263af4-8431-4454-0f8b-301a421fd6cc', '6c9997a4-591b-4cb3-9313-4ef45d6f134e')
ON CONFLICT (api_id, schema_id) DO NOTHING;

-- API schemas for private API
INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
)
SELECT
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  schema_id,
  'e257c53d-6ba6-40de-b679-61b37188a316'
FROM (VALUES
  ('6d264733-40be-4214-0c97-c3dbe8ba3b05'::uuid),
  ('6d263af4-8431-4454-0f8b-301a421fd6cc'::uuid)
) AS v(schema_id)
ON CONFLICT (api_id, schema_id) DO NOTHING;
