-- Integration test seed for graphile-i18n
-- Creates a base table with @i18n smart tag and a translation table

CREATE SCHEMA IF NOT EXISTS i18n_test;
GRANT USAGE ON SCHEMA i18n_test TO PUBLIC;

-- Base table
CREATE TABLE i18n_test.posts (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE i18n_test.posts IS E'@i18n posts_translations';

-- Translation table
CREATE TABLE i18n_test.posts_translations (
  id serial PRIMARY KEY,
  post_id int NOT NULL REFERENCES i18n_test.posts(id) ON DELETE CASCADE,
  lang_code text NOT NULL,
  title text NOT NULL,
  body text,
  UNIQUE (post_id, lang_code)
);
CREATE INDEX idx_posts_translations_post_id ON i18n_test.posts_translations(post_id);

-- Seed data: a post with English and Spanish translations
INSERT INTO i18n_test.posts (id, title, body) VALUES
  (1, 'Hello World', 'This is the original English post'),
  (2, 'Untranslated Post', 'This post has no translations');

INSERT INTO i18n_test.posts_translations (post_id, lang_code, title, body) VALUES
  (1, 'en', 'Hello World (EN)', 'English translation body'),
  (1, 'es', 'Hola Mundo', 'Cuerpo de traduccion en espanol'),
  (1, 'fr', 'Bonjour le Monde', 'Corps de traduction en francais');

SELECT setval('i18n_test.posts_id_seq', 10);

-- Grant access so withPgClient pool can query
GRANT ALL ON ALL TABLES IN SCHEMA i18n_test TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA i18n_test TO PUBLIC;
