-- Deploy schemas/public/domains/image to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN image AS jsonb CHECK (
  jsonb_typeof(value) = 'object'
  AND value ? 'url'
  AND jsonb_typeof(value->'url') = 'string'
  AND (value->>'url') ~ '^https?://[^\s]+$'
  AND (NOT value ? 'bucket' OR jsonb_typeof(value->'bucket') = 'string')
  AND (NOT value ? 'provider' OR jsonb_typeof(value->'provider') = 'string')
  AND (NOT value ? 'mime' OR jsonb_typeof(value->'mime') = 'string')
);
COMMENT ON DOMAIN image IS E'@name constructiveInternalTypeImage';
COMMIT;

