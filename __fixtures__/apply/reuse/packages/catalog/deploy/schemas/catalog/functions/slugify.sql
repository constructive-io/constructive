-- Deploy schemas/catalog/functions/slugify to pg

-- requires: schemas/catalog/schema

BEGIN;

CREATE FUNCTION catalog.slugify(input text) RETURNS text AS $$
  SELECT lower(regexp_replace(input, '\s+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

COMMIT;
