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

-- NOTE: no legacy services_public site/domain/theme/module rows are seeded.
-- The send-email and mailgun paths don't read site branding. The
-- send-verification-link success cases (which did) were removed here and move
-- to constructive-db along with the cloud function's migration off the legacy
-- site query shape; its validation path is still exercised by the e2e suite.

GRANT USAGE ON SCHEMA app_public TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.users TO administrator;

COMMIT;
