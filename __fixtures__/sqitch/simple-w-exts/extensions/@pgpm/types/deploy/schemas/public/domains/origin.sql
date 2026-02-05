-- Deploy schemas/public/domains/origin to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN origin AS text;
COMMENT ON DOMAIN origin IS E'@name constructiveInternalTypeOrigin';
COMMIT;

