-- Deploy schemas/public/domains/hostname to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN hostname AS text CHECK (value ~ '^[^\s]+$');
COMMENT ON DOMAIN hostname IS E'@name constructiveInternalTypeHostname';
COMMIT;

