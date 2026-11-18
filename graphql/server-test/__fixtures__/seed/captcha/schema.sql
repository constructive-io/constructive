-- Captcha fixture: the tenant's auth settings with `enable_captcha` on, and
-- stand-ins for the sign-up and password-reset mutations. Each stand-in
-- records its call, so a suite can tell a refused request from one that ran.
--
-- Compose after auth-cookie/schema.sql (which provides sign_in / sign_up).

CREATE TABLE "simple-pets-auth-private".app_settings_auth (
  cookie_secure boolean NOT NULL DEFAULT false,
  cookie_samesite text NOT NULL DEFAULT 'strict',
  cookie_domain text,
  cookie_httponly boolean NOT NULL DEFAULT true,
  cookie_max_age interval,
  cookie_path text NOT NULL DEFAULT '/',
  remember_me_duration interval,
  enable_captcha boolean NOT NULL DEFAULT false,
  captcha_site_key text
);
GRANT SELECT ON "simple-pets-auth-private".app_settings_auth TO administrator, authenticated, anonymous;

INSERT INTO "simple-pets-auth-private".app_settings_auth (enable_captcha, captcha_site_key)
VALUES (true, 'site-key');

-- The same row as the server's login-only reader hands it out.
CREATE FUNCTION "simple-pets-auth-private".app_settings_auth_request_policy()
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'cookie_secure', cookie_secure,
    'cookie_samesite', cookie_samesite,
    'cookie_domain', cookie_domain,
    'cookie_httponly', cookie_httponly,
    'cookie_max_age_seconds', extract(epoch FROM cookie_max_age)::int,
    'cookie_path', cookie_path,
    'remember_me_duration_seconds', extract(epoch FROM remember_me_duration)::int,
    'enable_captcha', enable_captcha,
    'captcha_site_key', captcha_site_key
  )
  FROM "simple-pets-auth-private".app_settings_auth
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE TABLE "simple-pets-auth-private".gated_calls (
  id serial PRIMARY KEY,
  name text NOT NULL
);
GRANT SELECT, INSERT, DELETE ON "simple-pets-auth-private".gated_calls TO administrator, authenticated, anonymous;
GRANT USAGE ON SEQUENCE "simple-pets-auth-private".gated_calls_id_seq TO administrator, authenticated, anonymous;

CREATE OR REPLACE FUNCTION "simple-pets-public".sign_up(email text, password text)
RETURNS "simple-pets-public".auth_token AS $$
  INSERT INTO "simple-pets-auth-private".gated_calls (name) VALUES ('sign_up');
  SELECT ROW('session-token')::"simple-pets-public".auth_token;
$$ LANGUAGE sql VOLATILE;

CREATE FUNCTION "simple-pets-public".sign_up_magic_link(email text)
RETURNS boolean AS $$
  INSERT INTO "simple-pets-auth-private".gated_calls (name) VALUES ('sign_up_magic_link');
  SELECT true;
$$ LANGUAGE sql VOLATILE;

CREATE FUNCTION "simple-pets-public".sign_up_sms(phone text)
RETURNS boolean AS $$
  INSERT INTO "simple-pets-auth-private".gated_calls (name) VALUES ('sign_up_sms');
  SELECT true;
$$ LANGUAGE sql VOLATILE;

CREATE FUNCTION "simple-pets-public".forgot_password(email text)
RETURNS boolean AS $$
  INSERT INTO "simple-pets-auth-private".gated_calls (name) VALUES ('forgot_password');
  SELECT true;
$$ LANGUAGE sql VOLATILE;

CREATE FUNCTION "simple-pets-public".reset_password(reset_token text, new_password text)
RETURNS boolean AS $$
  INSERT INTO "simple-pets-auth-private".gated_calls (name) VALUES ('reset_password');
  SELECT true;
$$ LANGUAGE sql VOLATILE;

-- ─── Metaschema registration ─────────────────────────────────────────────────

SET session_replication_role TO replica;

INSERT INTO metaschema_public.table (id, database_id, schema_id, name)
VALUES
  ('6dba0004-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0001-0000-4000-8000-000000000001', 'app_settings_auth')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.sessions_module
  (id, database_id, schema_id, auth_settings_table_id, auth_settings_table_name)
VALUES
  ('6dba0005-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
   '6dba0001-0000-4000-8000-000000000001', '6dba0004-0000-4000-8000-000000000001', 'app_settings_auth')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
