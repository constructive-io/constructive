-- Minimal reader contracts for the real server/loader pipeline. This fixture
-- tests runtime composition, not constructive-db's routing or policy SQL.
CREATE SCHEMA cors_test;
CREATE SCHEMA function_resolution;
CREATE SCHEMA routing_public;
CREATE SCHEMA app_scope;
GRANT USAGE ON SCHEMA cors_test TO anonymous, authenticated;

CREATE SEQUENCE cors_test.auth_calls MINVALUE 0 START 0;
CREATE SEQUENCE cors_test.graphql_calls MINVALUE 0 START 0;
SELECT setval('cors_test.auth_calls', 0, true), setval('cors_test.graphql_calls', 0, true);
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cors_test TO anonymous, authenticated;

CREATE FUNCTION cors_test.authenticate(token text)
RETURNS TABLE (user_id uuid) LANGUAGE plpgsql AS $$
BEGIN
  PERFORM nextval('cors_test.auth_calls');
  RETURN QUERY SELECT 'bbbbbbbb-0000-4000-8000-000000000001'::uuid
    WHERE token = 'cors-test-session';
END;
$$;

CREATE FUNCTION cors_test.touch() RETURNS text LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  PERFORM nextval('cors_test.graphql_calls');
  RETURN current_user;
END;
$$;

CREATE FUNCTION function_resolution.routing_planes()
RETURNS TABLE (database_id uuid, schema_name text, resolver_schema_name text, resolver_function_name text)
LANGUAGE sql AS $$
  SELECT 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
    'routing_public', 'routing_public', 'resolve_route';
$$;

CREATE FUNCTION routing_public.resolve_route(host text, path text, method text)
RETURNS TABLE (route_binding_id uuid, target_module text, target_source_id uuid, resolved_config jsonb)
LANGUAGE sql AS $$
  SELECT api_id, 'api', api_id, jsonb_build_object(
    'api_id', api_id,
    'database_id', 'aaaaaaaa-0000-4000-8000-000000000001',
    'role_name', 'authenticated', 'anon_role', 'anonymous',
    'is_public', true, 'schemas', ARRAY['cors_test'])
  FROM (VALUES
    ('a.cors.example', 'aaaaaaaa-0000-4000-8000-000000000011'::uuid),
    ('b.cors.example', 'aaaaaaaa-0000-4000-8000-000000000012'::uuid),
    ('empty.cors.example', 'aaaaaaaa-0000-4000-8000-000000000013'::uuid),
    ('broken.cors.example', 'aaaaaaaa-0000-4000-8000-000000000014'::uuid)
  ) AS routes(hostname, api_id) WHERE hostname = host;
$$;

CREATE FUNCTION function_resolution.cors_origins(database_id uuid, api_id uuid)
RETURNS TABLE (allowed_origins text[]) LANGUAGE plpgsql AS $$
BEGIN
  IF api_id = 'aaaaaaaa-0000-4000-8000-000000000014'::uuid THEN
    RAISE EXCEPTION 'CORS metadata unavailable';
  END IF;
  RETURN QUERY SELECT CASE api_id
    WHEN 'aaaaaaaa-0000-4000-8000-000000000011'::uuid THEN ARRAY['https://a.client.example']
    WHEN 'aaaaaaaa-0000-4000-8000-000000000012'::uuid THEN ARRAY['https://b.client.example']
    ELSE ARRAY[]::text[] END;
END;
$$;

CREATE FUNCTION function_resolution.tenant_auth_entry(database_id uuid)
RETURNS TABLE (authenticate_schema text, role_schema text, authenticate_function text,
  authenticate_strict_function text, current_role_function text, current_role_id_function text,
  current_user_agent_function text, current_ip_address_function text)
LANGUAGE sql AS $$ SELECT 'cors_test', 'cors_test', 'authenticate', 'authenticate',
  NULL::text, NULL::text, NULL::text, NULL::text; $$;

CREATE FUNCTION function_resolution.database_features(database_id uuid, api_id uuid)
RETURNS TABLE (enable_aggregates boolean, enable_postgis boolean, enable_search boolean,
  enable_direct_uploads boolean, enable_presigned_uploads boolean, enable_many_to_many boolean,
  enable_connection_filter boolean, enable_ltree boolean, enable_llm boolean,
  enable_realtime boolean, enable_bulk boolean, enable_i18n boolean)
LANGUAGE sql AS $$ SELECT false, false, false, false, false, false,
  false, false, false, false, false, false; $$;

CREATE FUNCTION function_resolution.pubkey_entry(database_id uuid)
RETURNS TABLE (schema_name text, crypto_network text, sign_up_with_key text,
  sign_in_request_challenge text, sign_in_record_failure text, sign_in_with_challenge text)
LANGUAGE sql AS $$ SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text WHERE false; $$;

CREATE FUNCTION function_resolution.webauthn_entry(database_id uuid)
RETURNS TABLE (schema_name text, credentials_schema text, sessions_schema text,
  session_secrets_schema text, rp_id text, rp_name text, origin_allowlist text[],
  attestation_type text, require_user_verification boolean, resident_key text, challenge_expiry_seconds integer)
LANGUAGE sql AS $$ SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
  NULL::text, NULL::text[], NULL::text, NULL::boolean, NULL::text, NULL::integer WHERE false; $$;

CREATE FUNCTION function_resolution.database_standing(database_id uuid)
RETURNS TABLE (suspended_at timestamptz, suspended_reason text)
LANGUAGE sql AS $$ SELECT NULL::timestamptz, NULL::text; $$;

CREATE FUNCTION function_resolution.request_protection(database_id uuid, api_id uuid)
RETURNS TABLE (db_max_query_depth integer)
LANGUAGE sql AS $$ SELECT 20; $$;

CREATE FUNCTION app_scope.platform_database_id() RETURNS uuid
LANGUAGE sql AS $$ SELECT 'aaaaaaaa-0000-4000-8000-000000000099'::uuid; $$;
