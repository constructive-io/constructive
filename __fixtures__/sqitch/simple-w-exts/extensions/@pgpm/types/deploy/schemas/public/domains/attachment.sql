-- Deploy schemas/public/domains/attachment to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN attachment AS text CHECK (value ~ '^https?://[^\s]+$');
COMMENT ON DOMAIN attachment IS E'@name constructiveInternalTypeAttachment';
COMMIT;
