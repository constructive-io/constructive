BEGIN;

CREATE SCHEMA IF NOT EXISTS app_public;

CREATE TABLE IF NOT EXISTS app_public.users (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  display_name text,
  profile_picture jsonb
);

INSERT INTO app_public.users (id, username, display_name, profile_picture)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'sender',
  'Sender',
  '{"url":"https://example.com/avatar.png","mime":"image/png"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.database (id, name)
VALUES ('0b22e268-16d6-582b-950a-24e108688849', 'jobs-test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services_public.sites (id, database_id, title, logo, dbname)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '0b22e268-16d6-582b-950a-24e108688849',
  'Jobs Test',
  '{"url":"https://example.com/logo.png","mime":"image/png"}'::jsonb,
  current_database()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services_public.domains (id, database_id, site_id, domain, subdomain)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '0b22e268-16d6-582b-950a-24e108688849',
  '11111111-1111-1111-1111-111111111111',
  'localhost',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services_public.site_themes (id, database_id, site_id, theme)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '0b22e268-16d6-582b-950a-24e108688849',
  '11111111-1111-1111-1111-111111111111',
  '{"primary":"#335C67"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services_public.site_modules (id, database_id, site_id, name, data)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '0b22e268-16d6-582b-950a-24e108688849',
  '11111111-1111-1111-1111-111111111111',
  'legal_terms_module',
  '{"emails":{"support":"support@example.com"},"company":{"name":"Constructive","nick":"Constructive","website":"https://constructive.io"}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

GRANT USAGE ON SCHEMA app_public TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.users TO administrator;

COMMIT;
