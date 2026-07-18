-- Deploy test-simple:embedding to pg
-- requires: table

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
ALTER TABLE test_app.users ADD COLUMN embedding public.vector(3);

COMMIT;
