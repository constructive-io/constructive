CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA app;
CREATE TABLE app.docs (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3) NOT NULL
);
INSERT INTO app.docs (title, embedding) VALUES ('alpha', '[1,0,0]');
