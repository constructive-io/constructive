-- Verify schemas/catalog/functions/slugify on pg

BEGIN;

SELECT catalog.slugify('Hello World');

ROLLBACK;
