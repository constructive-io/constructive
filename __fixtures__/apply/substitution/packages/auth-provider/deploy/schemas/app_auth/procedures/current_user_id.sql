-- Deploy schemas/app_auth/procedures/current_user_id to pg

-- requires: schemas/app_auth/schema

BEGIN;

CREATE FUNCTION app_auth.current_user_id() RETURNS uuid AS $$
  SELECT nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

COMMIT;
