CREATE SCHEMA settings_language_test;
CREATE TABLE settings_language_test.documents (
  id integer PRIMARY KEY,
  title text NOT NULL,
  fulltext tsvector NOT NULL,
  explicit_fulltext tsvector NOT NULL
);
COMMENT ON COLUMN settings_language_test.documents.fulltext IS E'@behavior +attribute:filterBy';
COMMENT ON COLUMN settings_language_test.documents.explicit_fulltext IS E'@tsConfig english\n@behavior +attribute:filterBy';
INSERT INTO settings_language_test.documents VALUES
  (1, 'French', to_tsvector('french', 'chevaux'), to_tsvector('french', 'chevaux')),
  (2, 'English', to_tsvector('english', 'running'), to_tsvector('english', 'running'));
