-- Integration-only implementation of the frozen Constructive/DB SSO seam.
-- Product state transitions remain owned and tested by Constructive DB; this
-- fixture lets graphql-server-test exercise the real HTTP, routing, Context,
-- GraphQL, Cookie, and PostgreSQL call boundary without mocking those layers.

CREATE SCHEMA tenant_test_sso_private;

CREATE TABLE metaschema_modules_public.unified_auth_module (
  database_id uuid NOT NULL,
  scope text NOT NULL,
  private_schema_id uuid NOT NULL
);

INSERT INTO metaschema_public.schema
  (id, database_id, name, schema_name, description, is_public)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'unified_auth_private',
  'tenant_test_sso_private',
  'Test-only unified authentication private surface',
  false
);

INSERT INTO metaschema_modules_public.unified_auth_module
  (database_id, scope, private_schema_id)
VALUES (
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'database',
  'f0000000-0000-0000-0000-000000000001'
);

CREATE TABLE tenant_test_sso_private.test_login_transactions (
  transaction_id text PRIMARY KEY,
  site_id uuid NOT NULL,
  callback_url text NOT NULL,
  return_to text NOT NULL,
  site_state text NOT NULL,
  browser_binding text NOT NULL,
  start_api_id text NOT NULL
);

CREATE TABLE tenant_test_sso_private.test_handoffs (
  code_hash bytea PRIMARY KEY,
  transaction_id text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE FUNCTION tenant_test_sso_private.start_unified_login(
  requested_site_id uuid,
  requested_callback_url text,
  requested_return_to text,
  requested_site_state text,
  requested_browser_binding text
)
RETURNS TABLE (
  transaction_id text,
  site_id uuid,
  site_display_name text,
  site_icon_url text,
  site_theme_color text,
  sign_in_mode text,
  reusable_authentication boolean,
  current_user_id uuid,
  current_user_display_name text,
  current_user_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_transaction_id text := repeat('t', 43);
  exact_site_id uuid := 'f1000000-0000-0000-0000-000000000001';
  exact_callback text := 'https://site-one.example/auth/complete?locale=en';
  routed_api_id text := current_setting('jwt.claims.api_id', true);
BEGIN
  IF requested_site_id <> exact_site_id THEN
    RAISE EXCEPTION 'INVALID_SSO_CALLBACK';
  END IF;
  IF requested_callback_url IS NOT NULL AND requested_callback_url <> exact_callback THEN
    RAISE EXCEPTION 'INVALID_SSO_CALLBACK';
  END IF;
  IF routed_api_id <> '6c9997a4-591b-4cb3-9313-4ef45d6f134e' THEN
    RAISE EXCEPTION 'INVALID_SSO_CALLBACK';
  END IF;

  INSERT INTO tenant_test_sso_private.test_login_transactions (
    transaction_id,
    site_id,
    callback_url,
    return_to,
    site_state,
    browser_binding,
    start_api_id
  ) VALUES (
    new_transaction_id,
    exact_site_id,
    exact_callback,
    requested_return_to,
    requested_site_state,
    requested_browser_binding,
    routed_api_id
  )
  ON CONFLICT ON CONSTRAINT test_login_transactions_pkey DO UPDATE SET
    return_to = EXCLUDED.return_to,
    site_state = EXCLUDED.site_state,
    browser_binding = EXCLUDED.browser_binding,
    start_api_id = EXCLUDED.start_api_id;

  RETURN QUERY SELECT
    new_transaction_id,
    exact_site_id,
    'Customer Portal'::text,
    NULL::text,
    '#112233'::text,
    'confirm'::text,
    false,
    NULL::uuid,
    NULL::text,
    NULL::text;
END;
$function$;

CREATE FUNCTION tenant_test_sso_private.sign_in_unified_login(
  requested_transaction_id text,
  requested_email text,
  requested_password text,
  requested_remember_me boolean,
  requested_credential_kind text,
  requested_browser_binding text,
  requested_device_token text,
  requested_handoff_hash bytea
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  access_token text,
  access_token_expires_at timestamptz,
  is_verified boolean,
  totp_enabled boolean,
  mfa_required boolean,
  callback_url text,
  site_state text,
  handoff_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  login tenant_test_sso_private.test_login_transactions%ROWTYPE;
  expiry timestamptz := clock_timestamp() + interval '1 minute';
BEGIN
  SELECT * INTO STRICT login
  FROM tenant_test_sso_private.test_login_transactions transaction_row
  WHERE transaction_row.transaction_id = requested_transaction_id;

  IF login.browser_binding <> requested_browser_binding OR
     requested_email <> 'user@example.com' OR
     requested_password <> 'correct horse battery staple' OR
     requested_credential_kind <> 'bearer' OR
     current_setting('jwt.claims.api_id', true) <> login.start_api_id THEN
    RAISE EXCEPTION 'BAD_SIGNIN';
  END IF;

  INSERT INTO tenant_test_sso_private.test_handoffs (
    code_hash,
    transaction_id,
    expires_at
  ) VALUES (
    requested_handoff_hash,
    requested_transaction_id,
    expiry
  );

  RETURN QUERY SELECT
    'f2000000-0000-0000-0000-000000000001'::uuid,
    'f3000000-0000-0000-0000-000000000001'::uuid,
    'cnc_live_bt_auth_center_fixture'::text,
    clock_timestamp() + interval '1 hour',
    true,
    false,
    false,
    login.callback_url,
    login.site_state,
    expiry;
END;
$function$;

GRANT USAGE ON SCHEMA tenant_test_sso_private TO anonymous, authenticated;
GRANT EXECUTE ON FUNCTION tenant_test_sso_private.start_unified_login(uuid, text, text, text, text)
  TO anonymous, authenticated;
GRANT EXECUTE ON FUNCTION tenant_test_sso_private.sign_in_unified_login(text, text, text, boolean, text, text, text, bytea)
  TO anonymous, authenticated;
