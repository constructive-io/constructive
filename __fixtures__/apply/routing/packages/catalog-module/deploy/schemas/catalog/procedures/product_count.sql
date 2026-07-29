-- Deploy schemas/catalog/procedures/product_count to pg

-- requires: schemas/catalog/schema
-- requires: schemas/reporting/schema
-- requires: schemas/catalog/tables/products/table

BEGIN;

CREATE FUNCTION catalog.product_count() RETURNS bigint AS $$
  SELECT count(*) FROM catalog.products;
$$ LANGUAGE sql STABLE;

COMMIT;
