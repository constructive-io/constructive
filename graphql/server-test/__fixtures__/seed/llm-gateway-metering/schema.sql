-- Tables whose vector columns are searched, written and retrieved through the
-- server-side embedder: `articles` (nullable vector, searched by `text` and
-- written by `embeddingText`) with a chunks table for `ragQuery`.
--
-- Compose after app-schemas/simple-pets/schema.sql, scoped/test-data.sql and
-- auth-cookie/schema.sql (which registers `authenticate` for the database).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS llm_gateway_metering;

GRANT USAGE ON SCHEMA llm_gateway_metering TO administrator, authenticated, anonymous;

CREATE TABLE llm_gateway_metering.articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3)
);

COMMENT ON TABLE llm_gateway_metering.articles IS E'@hasChunks {"chunksTable":"articles_chunks","parentFk":"parent_id","parentPk":"id","embeddingField":"embedding","contentField":"content"}';

CREATE TABLE llm_gateway_metering.articles_chunks (
  id serial PRIMARY KEY,
  parent_id integer NOT NULL REFERENCES llm_gateway_metering.articles(id),
  content text NOT NULL,
  embedding vector(3) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON llm_gateway_metering.articles, llm_gateway_metering.articles_chunks
  TO administrator, authenticated, anonymous;
GRANT USAGE, SELECT ON SEQUENCE llm_gateway_metering.articles_id_seq, llm_gateway_metering.articles_chunks_id_seq
  TO administrator, authenticated, anonymous;

INSERT INTO llm_gateway_metering.articles (id, title, embedding) VALUES
  (1, 'Introduction to Machine Learning', '[0.1, 0.9, 0.3]'),
  (2, 'PostgreSQL Performance Tuning', '[0.8, 0.2, 0.5]');
SELECT setval('llm_gateway_metering.articles_id_seq', 2);

INSERT INTO llm_gateway_metering.articles_chunks (parent_id, content, embedding) VALUES
  (1, 'Machine learning is a subset of artificial intelligence.', '[0.1, 0.9, 0.3]'),
  (2, 'Tune shared_buffers and work_mem before adding indexes.', '[0.8, 0.2, 0.5]');

-- ─── Metaschema registration: expose the schema on the `app` API ─────────────

SET session_replication_role TO replica;

INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, is_public)
VALUES
  ('6dbaf00d-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'llm_gateway_metering', 'llm_gateway_metering', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.api_schemas (id, database_id, schema_id, api_id)
VALUES
  ('6dbaf00d-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dbaf00d-0000-4000-8000-000000000001', '6c9997a4-591b-4cb3-9313-4ef45d6f134e')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
