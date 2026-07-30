-- Deploy schemas/identity/procedures/current_actor to pg

-- requires: schemas/identity/schema

BEGIN;

CREATE FUNCTION identity.current_actor() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.claims.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

COMMIT;
