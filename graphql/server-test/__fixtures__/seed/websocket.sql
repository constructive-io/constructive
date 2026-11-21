CREATE SCHEMA "simple-pets-auth-private";
COMMENT ON TABLE "simple-pets-pets-public".animals IS E'@realtime';
CREATE TABLE "simple-pets-public".search_language_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  fulltext tsvector NOT NULL
);
INSERT INTO "simple-pets-public".search_language_documents (title, fulltext)
VALUES ('opaque', to_tsvector('french', 'chevaux'));
GRANT SELECT ON "simple-pets-public".search_language_documents TO authenticated;
ALTER TABLE "simple-pets-public".search_language_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_documents ON "simple-pets-public".search_language_documents
  FOR SELECT TO authenticated USING (true);
GRANT USAGE ON SCHEMA "simple-pets-auth-private" TO authenticated, anonymous;
CREATE TABLE "simple-pets-auth-private".sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE FUNCTION "simple-pets-public".issue_session(actor uuid) RETURNS text AS $$
  INSERT INTO "simple-pets-auth-private".sessions (user_id) VALUES (actor) RETURNING token;
$$ LANGUAGE sql VOLATILE;
GRANT INSERT, SELECT ON "simple-pets-auth-private".sessions TO anonymous, authenticated;
GRANT EXECUTE ON FUNCTION "simple-pets-public".issue_session(uuid) TO anonymous, authenticated;
CREATE FUNCTION "simple-pets-auth-private".authenticate(credential text)
RETURNS TABLE (id uuid, user_id uuid) AS $$
  SELECT s.id, s.user_id FROM "simple-pets-auth-private".sessions s
  WHERE s.token = credential AND s.expires_at > now();
$$ LANGUAGE sql STABLE;
GRANT EXECUTE ON FUNCTION "simple-pets-auth-private".authenticate(text) TO anonymous, authenticated;

SET session_replication_role TO replica;
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, is_public)
VALUES ('6dba0001-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'auth_private', 'simple-pets-auth-private', false);
INSERT INTO metaschema_public.function (id, database_id, schema_id, name)
VALUES ('6dba0002-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0001-0000-4000-8000-000000000001', 'authenticate');
INSERT INTO routing_public.rls_settings (database_id, authenticate_schema_id, authenticate_function_id, authenticate_strict_function_id)
VALUES ('80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba0001-0000-4000-8000-000000000001', '6dba0002-0000-4000-8000-000000000001', '6dba0002-0000-4000-8000-000000000001');
INSERT INTO routing_public.database_settings (database_id, enable_realtime, enable_search, max_concurrent_requests, max_queue_wait_ms, max_request_bytes)
VALUES ('80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', true, true, 2, 0, 1024);
SET session_replication_role TO DEFAULT;
