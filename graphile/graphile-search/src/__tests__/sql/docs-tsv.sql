CREATE SCHEMA app;
CREATE TABLE app.docs (
  id serial PRIMARY KEY,
  title text NOT NULL,
  tsv tsvector NOT NULL
);
CREATE INDEX idx_docs_tsv ON app.docs USING gin(tsv);
INSERT INTO app.docs (title, tsv) VALUES ('alpha', to_tsvector('english', 'alpha'));
