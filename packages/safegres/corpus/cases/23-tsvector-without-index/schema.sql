DROP SCHEMA IF EXISTS c_search_no_index CASCADE;
CREATE SCHEMA c_search_no_index;
GRANT USAGE ON SCHEMA c_search_no_index TO corpus_user, corpus_anon;

CREATE TABLE c_search_no_index.articles (
  id bigserial PRIMARY KEY,
  body text,
  -- The flaw: a tsvector column with no GIN/GiST index. Every full-text
  -- query is a sequential scan that recomputes nothing and reads everything.
  search_doc tsvector
);

GRANT SELECT ON c_search_no_index.articles TO corpus_user;
