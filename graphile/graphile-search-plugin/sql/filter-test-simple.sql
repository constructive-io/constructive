SET client_min_messages TO WARNING;
BEGIN;
DROP SCHEMA IF EXISTS filter_simple_test CASCADE;
CREATE SCHEMA filter_simple_test;
GRANT USAGE ON SCHEMA filter_simple_test TO public;
GRANT CREATE ON SCHEMA filter_simple_test TO public;
ALTER DEFAULT PRIVILEGES IN SCHEMA filter_simple_test GRANT ALL ON TABLES TO public;
ALTER DEFAULT PRIVILEGES IN SCHEMA filter_simple_test GRANT ALL ON SEQUENCES TO public;

CREATE TABLE filter_simple_test.simple_job (
  id serial primary key,
  name text not null,
  tsv tsvector
);
GRANT ALL ON TABLE filter_simple_test.simple_job TO public;
GRANT ALL ON SEQUENCE filter_simple_test.simple_job_id_seq TO public;

-- Seed data
INSERT INTO filter_simple_test.simple_job (name, tsv) VALUES
  ('test', to_tsvector('apple fruit'));

COMMIT;
