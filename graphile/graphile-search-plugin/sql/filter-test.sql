SET client_min_messages TO WARNING;
BEGIN;
DROP SCHEMA IF EXISTS filter_test CASCADE;
CREATE SCHEMA filter_test;
GRANT USAGE ON SCHEMA filter_test TO public;
GRANT CREATE ON SCHEMA filter_test TO public;
ALTER DEFAULT PRIVILEGES IN SCHEMA filter_test GRANT ALL ON TABLES TO public;
ALTER DEFAULT PRIVILEGES IN SCHEMA filter_test GRANT ALL ON SEQUENCES TO public;

-- Basic job table for single tsvector tests
CREATE TABLE filter_test.job (
  id serial primary key,
  name text not null,
  full_text tsvector
);
GRANT ALL ON TABLE filter_test.job TO public;
GRANT ALL ON SEQUENCE filter_test.job_id_seq TO public;

-- Table with multiple tsvector columns
CREATE TABLE filter_test.multi_tsv_job (
  id serial primary key,
  name text not null,
  full_text tsvector,
  other_full_text tsvector
);
GRANT ALL ON TABLE filter_test.multi_tsv_job TO public;
GRANT ALL ON SEQUENCE filter_test.multi_tsv_job_id_seq TO public;

-- Tables for connectionFilterRelations tests
CREATE TABLE filter_test.clients (
  id serial primary key,
  comment text,
  tsv tsvector
);
CREATE TABLE filter_test.orders (
  id serial primary key,
  client_id integer references filter_test.clients (id),
  comment text,
  tsv tsvector
);
GRANT ALL ON TABLE filter_test.clients TO public;
GRANT ALL ON TABLE filter_test.orders TO public;
GRANT ALL ON SEQUENCE filter_test.clients_id_seq TO public;
GRANT ALL ON SEQUENCE filter_test.orders_id_seq TO public;

-- Seed data for single tsvector tests
INSERT INTO filter_test.job (name, full_text) VALUES
  ('test', to_tsvector('apple fruit')),
  ('test 2', to_tsvector('banana fruit'));

-- Seed data for multi tsvector tests
INSERT INTO filter_test.multi_tsv_job (name, full_text, other_full_text) VALUES
  ('test', to_tsvector('apple fruit'), to_tsvector('vegetable potato')),
  ('test 2', to_tsvector('banana fruit'), to_tsvector('vegetable pumpkin'));

-- Seed data for connectionFilterRelations tests
INSERT INTO filter_test.clients (id, comment, tsv) VALUES
  (1, 'Client A', to_tsvector('fruit apple')),
  (2, 'Client Z', to_tsvector('fruit avocado'));

INSERT INTO filter_test.orders (id, client_id, comment, tsv) VALUES
  (1, 1, 'X', to_tsvector('fruit apple')),
  (2, 1, 'Y', to_tsvector('fruit pear apple')),
  (3, 1, 'Z', to_tsvector('vegetable potato')),
  (4, 2, 'X', to_tsvector('fruit apple')),
  (5, 2, 'Y', to_tsvector('fruit tomato')),
  (6, 2, 'Z', to_tsvector('vegetable'));

COMMIT;
