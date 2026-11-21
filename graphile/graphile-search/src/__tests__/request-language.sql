CREATE SCHEMA request_language_test;
CREATE TABLE request_language_test.articles (
  id integer PRIMARY KEY,
  body text NOT NULL,
  tsv tsvector NOT NULL,
  explicit_tsv tsvector NOT NULL
);
COMMENT ON COLUMN request_language_test.articles.tsv IS E'@behavior +attribute:filterBy';
COMMENT ON COLUMN request_language_test.articles.explicit_tsv IS E'@tsConfig english\n@behavior +attribute:filterBy';
INSERT INTO request_language_test.articles VALUES
  (1, 'chevaux', to_tsvector('french', 'chevaux'), to_tsvector('french', 'chevaux')),
  (2, 'running', to_tsvector('english', 'running'), to_tsvector('english', 'running'));
