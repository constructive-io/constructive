-- Revert schemas/catalog/functions/slugify from pg

BEGIN;

DROP FUNCTION catalog.slugify(text);

COMMIT;
