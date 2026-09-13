CREATE SCHEMA request_context_test;
GRANT USAGE ON SCHEMA request_context_test TO anonymous, authenticated;

CREATE FUNCTION request_context_test.context_probe()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'currentUser', current_user,
    'userId', current_setting('jwt.claims.user_id', true),
    'apiId', current_setting('jwt.claims.api_id', true),
    'databaseId', current_setting('jwt.claims.database_id', true),
    'requestId', current_setting('request.id', true),
    'readOnly', current_setting('transaction_read_only'),
    'rowSecurity', current_setting('row_security'),
    'searchPath', current_setting('search_path')
  )
$$;
GRANT EXECUTE ON FUNCTION request_context_test.context_probe() TO anonymous, authenticated;

CREATE TABLE request_context_test.posts (
  id integer PRIMARY KEY,
  title text NOT NULL
);
COMMENT ON TABLE request_context_test.posts IS E'@i18n posts_translations';

CREATE TABLE request_context_test.posts_translations (
  id integer PRIMARY KEY,
  post_id integer NOT NULL REFERENCES request_context_test.posts(id),
  lang_code text NOT NULL,
  title text NOT NULL,
  UNIQUE (post_id, lang_code)
);

INSERT INTO request_context_test.posts (id, title)
VALUES (1, 'Base title');
INSERT INTO request_context_test.posts_translations (id, post_id, lang_code, title)
VALUES (1, 1, 'en', 'Context-approved translation');

ALTER TABLE request_context_test.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_context_test.posts_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY complete_request_context_posts
ON request_context_test.posts
FOR SELECT
TO authenticated
USING (
  current_user = 'authenticated'
  AND current_setting('jwt.claims.user_id', true) = 'user-1'
  AND current_setting('jwt.claims.api_id', true) = 'api-1'
  AND current_setting('jwt.claims.database_id', true) = 'database-1'
  AND current_setting('request.id', true) = 'f13-request'
  AND current_setting('transaction_read_only') = 'off'
  AND current_setting('row_security') = 'on'
  AND current_setting('search_path') = 'pg_catalog, "request_context_test"'
);

CREATE POLICY complete_request_context_translations
ON request_context_test.posts_translations
FOR SELECT
TO authenticated
USING (
  current_user = 'authenticated'
  AND current_setting('jwt.claims.user_id', true) = 'user-1'
  AND current_setting('jwt.claims.api_id', true) = 'api-1'
  AND current_setting('jwt.claims.database_id', true) = 'database-1'
  AND current_setting('request.id', true) = 'f13-request'
  AND current_setting('transaction_read_only') = 'off'
  AND current_setting('row_security') = 'on'
  AND current_setting('search_path') = 'pg_catalog, "request_context_test"'
);

GRANT SELECT ON request_context_test.posts TO anonymous, authenticated;
GRANT SELECT ON request_context_test.posts_translations TO anonymous, authenticated;

CREATE TABLE request_context_test.public_key_audit (
  public_key text NOT NULL
);
GRANT SELECT, INSERT ON request_context_test.public_key_audit TO anonymous, authenticated;

CREATE FUNCTION request_context_test.sign_up_with_key(public_key text)
RETURNS TABLE(sign_up_with_key text)
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  INSERT INTO request_context_test.public_key_audit VALUES (public_key);
  IF public_key = 'force-rollback' THEN
    RAISE EXCEPTION 'forced public-key rollback';
  END IF;
  RETURN QUERY SELECT public_key;
END
$$;

CREATE FUNCTION request_context_test.sign_in_request_challenge(public_key text)
RETURNS TABLE(sign_in_request_challenge text)
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'currentUser', current_user,
    'userId', current_setting('jwt.claims.user_id', true),
    'apiId', current_setting('jwt.claims.api_id', true),
    'databaseId', current_setting('jwt.claims.database_id', true),
    'requestId', current_setting('request.id', true),
    'readOnly', current_setting('transaction_read_only'),
    'rowSecurity', current_setting('row_security'),
    'searchPath', current_setting('search_path'),
    'publicKey', public_key
  )::text
$$;

CREATE FUNCTION request_context_test.sign_in_record_failure(public_key text)
RETURNS void
LANGUAGE sql
VOLATILE
AS $$ SELECT NULL::void $$;

CREATE FUNCTION request_context_test.sign_in_with_challenge(public_key text, message text)
RETURNS TABLE(access_token text, access_token_expires_at timestamptz)
LANGUAGE sql
VOLATILE
AS $$ SELECT public_key || message, now() + interval '1 hour' $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA request_context_test TO anonymous, authenticated;
