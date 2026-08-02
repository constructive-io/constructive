DROP SCHEMA IF EXISTS c_search_indexed CASCADE;
CREATE SCHEMA c_search_indexed;
GRANT USAGE ON SCHEMA c_search_indexed TO corpus_user, corpus_anon;

CREATE TABLE c_search_indexed.articles (
  id bigserial PRIMARY KEY,
  body text,
  search_doc tsvector
);
CREATE INDEX articles_search_idx ON c_search_indexed.articles USING gin (search_doc);

GRANT SELECT ON c_search_indexed.articles TO corpus_user;
