-- Deploy schemas/app/functions/hash_pw to pg

-- requires: schemas/app/schema

BEGIN;

CREATE FUNCTION app.hash_pw(pw text) RETURNS text AS $$
  SELECT extensions.crypt(pw, extensions.gen_salt('bf'));
$$ LANGUAGE sql VOLATILE;

GRANT EXECUTE ON FUNCTION app.hash_pw(text) TO authenticated;

COMMIT;
