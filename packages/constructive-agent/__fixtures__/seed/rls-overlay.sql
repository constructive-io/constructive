-- Constructive-agent RLS/auth overlay for integration tests.
-- Applied after graphql/server-test simple-seed-services fixtures.

-- Token-based auth functions consumed by graphql/server auth middleware.
CREATE OR REPLACE FUNCTION "simple-pets-private".authenticate(token text)
RETURNS TABLE(role text, user_id uuid, database_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  IF token = 'token-user-1' THEN
    RETURN QUERY
      SELECT
        'authenticated'::text,
        '11111111-1111-1111-1111-111111111111'::uuid,
        '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9'::uuid;
    RETURN;
  END IF;

  IF token = 'token-user-2' THEN
    RETURN QUERY
      SELECT
        'authenticated'::text,
        '22222222-2222-2222-2222-222222222222'::uuid,
        '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9'::uuid;
    RETURN;
  END IF;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION "simple-pets-private".authenticate_strict(token text)
RETURNS TABLE(role text, user_id uuid, database_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  IF token = 'token-user-1' OR token = 'token-user-2' THEN
    RETURN QUERY
      SELECT *
      FROM "simple-pets-private".authenticate(token);
    RETURN;
  END IF;

  RAISE EXCEPTION 'invalid token';
END;
$$;

-- Attach RLS module metadata so middleware can resolve auth function + private schema.
INSERT INTO metaschema_modules_public.rls_module (
  id,
  database_id,
  api_id,
  schema_id,
  private_schema_id,
  tokens_table_id,
  users_table_id,
  authenticate,
  authenticate_strict,
  "current_role",
  current_role_id
)
VALUES (
  'f3333333-3333-4333-8333-333333333333',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'e257c53d-6ba6-40de-b679-61b37188a316',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  '6dba9876-043f-48ee-399d-ddc991ad978d',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'authenticate',
  'authenticate_strict',
  'current_user',
  'current_user_id'
)
ON CONFLICT (api_id) DO UPDATE
SET
  private_schema_id = EXCLUDED.private_schema_id,
  authenticate = EXCLUDED.authenticate,
  authenticate_strict = EXCLUDED.authenticate_strict,
  "current_role" = EXCLUDED."current_role",
  current_role_id = EXCLUDED.current_role_id;

-- Ensure authenticated requests execute with authenticated role (RLS subject).
UPDATE services_public.apis
SET
  role_name = 'authenticated',
  anon_role = 'anonymous'
WHERE id = 'e257c53d-6ba6-40de-b679-61b37188a316';

-- Seed deterministic ownership and enforce RLS by JWT claim.
UPDATE "simple-pets-pets-public".animals
SET owner_id = CASE
  WHEN id IN (
    'a0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000003'
  ) THEN '11111111-1111-1111-1111-111111111111'::uuid
  ELSE '22222222-2222-2222-2222-222222222222'::uuid
END;

ALTER TABLE "simple-pets-pets-public".animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simple-pets-pets-public".animals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS animals_select_by_owner ON "simple-pets-pets-public".animals;
DROP POLICY IF EXISTS animals_insert_by_owner ON "simple-pets-pets-public".animals;
DROP POLICY IF EXISTS animals_update_by_owner ON "simple-pets-pets-public".animals;
DROP POLICY IF EXISTS animals_delete_by_owner ON "simple-pets-pets-public".animals;

CREATE POLICY animals_select_by_owner
ON "simple-pets-pets-public".animals
FOR SELECT
TO authenticated
USING (owner_id::text = current_setting('jwt.claims.user_id', true));

CREATE POLICY animals_insert_by_owner
ON "simple-pets-pets-public".animals
FOR INSERT
TO authenticated
WITH CHECK (owner_id::text = current_setting('jwt.claims.user_id', true));

CREATE POLICY animals_update_by_owner
ON "simple-pets-pets-public".animals
FOR UPDATE
TO authenticated
USING (owner_id::text = current_setting('jwt.claims.user_id', true))
WITH CHECK (owner_id::text = current_setting('jwt.claims.user_id', true));

CREATE POLICY animals_delete_by_owner
ON "simple-pets-pets-public".animals
FOR DELETE
TO authenticated
USING (owner_id::text = current_setting('jwt.claims.user_id', true));
