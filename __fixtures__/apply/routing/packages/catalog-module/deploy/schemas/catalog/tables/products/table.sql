-- Deploy schemas/catalog/tables/products/table to pg

-- requires: schemas/catalog/schema

BEGIN;

CREATE TABLE catalog.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

COMMIT;
