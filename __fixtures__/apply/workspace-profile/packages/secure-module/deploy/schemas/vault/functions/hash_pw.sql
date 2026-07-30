-- Deploy schemas/vault/functions/hash_pw to pg

-- requires: schemas/vault/schema

BEGIN;

CREATE FUNCTION vault.hash_pw(pw text) RETURNS text AS $$
  SELECT crypt(pw, gen_salt('bf'));
$$ LANGUAGE sql VOLATILE;

GRANT EXECUTE ON FUNCTION vault.hash_pw(text) TO anonymous;
GRANT USAGE ON SCHEMA vault TO administrator;

COMMIT;
