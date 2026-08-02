DROP SCHEMA IF EXISTS c_fk_indexed CASCADE;
CREATE SCHEMA c_fk_indexed;
GRANT USAGE ON SCHEMA c_fk_indexed TO corpus_user, corpus_anon;

CREATE TABLE c_fk_indexed.authors (
  id bigserial PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE c_fk_indexed.books (
  id bigserial PRIMARY KEY,
  author_id bigint NOT NULL REFERENCES c_fk_indexed.authors (id) ON DELETE CASCADE,
  title text NOT NULL
);
CREATE INDEX books_author_idx ON c_fk_indexed.books (author_id);

GRANT SELECT ON c_fk_indexed.authors, c_fk_indexed.books TO corpus_user;
