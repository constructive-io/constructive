-- Tables with pgvector columns written by `vector` or by the server-embedded `{column}Text` companion.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS vector_text_mutations;

GRANT USAGE ON SCHEMA vector_text_mutations TO administrator, authenticated, anonymous;

CREATE TABLE vector_text_mutations.articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3) NOT NULL
);

CREATE TABLE vector_text_mutations.notes (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON vector_text_mutations.articles, vector_text_mutations.notes
  TO administrator, authenticated, anonymous;
GRANT USAGE, SELECT ON SEQUENCE vector_text_mutations.articles_id_seq, vector_text_mutations.notes_id_seq
  TO administrator, authenticated, anonymous;

INSERT INTO vector_text_mutations.articles (title, embedding) VALUES ('seed', '[0.5, 0.5, 0.5]');
INSERT INTO vector_text_mutations.notes (title) VALUES ('seed');
