DROP SCHEMA IF EXISTS c_fk_no_index CASCADE;
CREATE SCHEMA c_fk_no_index;
GRANT USAGE ON SCHEMA c_fk_no_index TO corpus_user, corpus_anon;

CREATE TABLE c_fk_no_index.authors (
  id bigserial PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE c_fk_no_index.books (
  id bigserial PRIMARY KEY,
  -- The flaw: no index on the referencing column. Every DELETE on authors
  -- seq-scans books, and the join has no index either.
  author_id bigint NOT NULL REFERENCES c_fk_no_index.authors (id) ON DELETE CASCADE,
  title text NOT NULL
);

GRANT SELECT ON c_fk_no_index.authors, c_fk_no_index.books TO corpus_user;
