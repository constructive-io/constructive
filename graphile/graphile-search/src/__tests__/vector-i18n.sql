-- Seed for vector search in the request's language.
-- articles carries @i18n articles_translations; each translation has its own vector.
--
-- Requires postgres-plus:18 image with: vector

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS vector_i18n_test;

CREATE TABLE vector_i18n_test.articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3)
);

COMMENT ON TABLE vector_i18n_test.articles IS E'@i18n articles_translations';

CREATE TABLE vector_i18n_test.articles_translations (
  id serial PRIMARY KEY,
  articles_id integer NOT NULL REFERENCES vector_i18n_test.articles(id),
  lang_code text NOT NULL,
  title text,
  embedding vector(3),
  UNIQUE (articles_id, lang_code)
);

-- Every article's own text points away from the query except article 1;
-- articles 2 and 3 only match the query through a translation.
INSERT INTO vector_i18n_test.articles (id, title, embedding) VALUES
  (1, 'matches in the default language',  '[1, 0, 0]'),
  (2, 'matches only in French',           '[0, 1, 0]'),
  (3, 'matches only in Spanish',          '[0, 0, 1]'),
  (4, 'no match in any language',         '[0, 1, 0]');

INSERT INTO vector_i18n_test.articles_translations (articles_id, lang_code, title, embedding) VALUES
  (2, 'fr', 'correspond en français',       '[1, 0, 0]'),
  (3, 'es', 'coincide en español',          '[1, 0, 0]'),
  (4, 'fr', 'ne correspond pas',            '[0, 0, 1]'),
  -- Article 1's French translation points away: a French request compares
  -- through it, so article 1 is not a French match.
  (1, 'fr', 'ne correspond pas en français', '[0, 1, 0]');
