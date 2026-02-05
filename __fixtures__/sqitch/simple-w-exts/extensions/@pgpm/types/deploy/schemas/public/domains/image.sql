-- Deploy schemas/public/domains/image to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN image AS jsonb CHECK (value ? 'url');
COMMENT ON DOMAIN image IS E'@name constructiveInternalTypeImage';
COMMIT;

