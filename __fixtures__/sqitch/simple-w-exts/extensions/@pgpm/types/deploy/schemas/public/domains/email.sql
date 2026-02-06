-- Deploy schemas/public/domains/email to pg
-- requires: schemas/public/schema

BEGIN;
CREATE DOMAIN email AS citext CHECK (value ~ '@');
COMMENT ON DOMAIN email IS E'@name constructiveInternalTypeEmail';
COMMIT;

