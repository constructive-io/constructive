-- A table with a pgvector column, searched by `vector` or by server-embedded `text`.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS vector_text_search;

GRANT USAGE ON SCHEMA vector_text_search TO administrator, authenticated, anonymous;

CREATE TABLE vector_text_search.articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON vector_text_search.articles TO administrator, authenticated, anonymous;
GRANT USAGE, SELECT ON SEQUENCE vector_text_search.articles_id_seq TO administrator, authenticated, anonymous;

INSERT INTO vector_text_search.articles (title, embedding) VALUES
  ('Introduction to Machine Learning', '[0.1, 0.9, 0.3]'),
  ('PostgreSQL Performance Tuning', '[0.8, 0.2, 0.5]'),
  ('Web Development Basics', '[0.5, 0.5, 0.5]');
