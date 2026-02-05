-- Deploy schemas/public/domains/upload to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN upload AS jsonb CHECK (value ? 'url' OR value ? 'id' OR value ? 'key');
COMMENT ON DOMAIN upload IS E'@name constructiveInternalTypeUpload';
COMMIT;
