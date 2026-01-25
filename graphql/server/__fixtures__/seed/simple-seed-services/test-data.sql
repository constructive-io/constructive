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

-- Anonymous/authenticated access for meta schemas (needed for X-Meta-Schema scenario)
GRANT USAGE ON SCHEMA metaschema_public TO anonymous, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_public TO anonymous, authenticated;
GRANT USAGE ON SCHEMA services_public TO anonymous;
GRANT SELECT ON ALL TABLES IN SCHEMA services_public TO anonymous, authenticated;
GRANT USAGE ON SCHEMA metaschema_modules_public TO anonymous, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_modules_public TO anonymous, authenticated;

-- Services API wiring for integration tests
UPDATE services_public.apis
SET dbname = current_database()
WHERE database_id = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

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

INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
) VALUES
(
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
),
(
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
),
-- api_schemas for the "private" API (e257c53d) linking to both public schemas
(
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  'e257c53d-6ba6-40de-b679-61b37188a316'
),
(
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
  'e257c53d-6ba6-40de-b679-61b37188a316'
);

-- Domain entry for the "private" API (isPublic=false) for domain fallback testing
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

