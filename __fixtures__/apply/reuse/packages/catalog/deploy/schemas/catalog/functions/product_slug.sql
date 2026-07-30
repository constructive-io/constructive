-- Deploy schemas/catalog/functions/product_slug to pg

-- requires: schemas/catalog/schema
-- requires: schemas/catalog/functions/slugify
-- requires: schemas/catalog/tables/products/table

BEGIN;

CREATE FUNCTION catalog.product_slug(pid uuid) RETURNS text AS $$
  SELECT catalog.slugify(name) FROM catalog.products WHERE id = pid;
$$ LANGUAGE sql STABLE;

COMMIT;
