-- Seed for vector search over rows that have no embedding.
-- notes: parent embedding is nullable; notes_chunks: chunk embedding is nullable.
--
-- Requires postgres-plus:18 image with: vector

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS vector_unembedded_test;

CREATE TABLE vector_unembedded_test.notes (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3)
);

CREATE INDEX idx_notes_embedding ON vector_unembedded_test.notes
  USING hnsw(embedding vector_cosine_ops);

CREATE TABLE vector_unembedded_test.notes_chunks (
  id serial PRIMARY KEY,
  note_id integer NOT NULL REFERENCES vector_unembedded_test.notes(id),
  content text NOT NULL,
  embedding vector(3)
);

CREATE INDEX idx_notes_chunks_embedding ON vector_unembedded_test.notes_chunks
  USING hnsw(embedding vector_cosine_ops);

-- 7 rows: 3 with a parent embedding, 1 with a chunk embedding only, 3 with none.
INSERT INTO vector_unembedded_test.notes (id, title, embedding) VALUES
  (1, 'parent embedding, no chunks',        '[1, 0, 0]'),
  (2, 'parent embedding, embedded chunk',   '[0, 1, 0]'),
  (3, 'no parent embedding, embedded chunk', NULL),
  (4, 'no embedding anywhere',               NULL),
  (5, 'no parent embedding, unembedded chunk', NULL),
  (6, 'parent embedding, no chunks (far)',   '[0.707, 0.707, 0]'),
  (7, 'no embedding anywhere (2)',           NULL);

SELECT setval('vector_unembedded_test.notes_id_seq', 7);

INSERT INTO vector_unembedded_test.notes_chunks (id, note_id, content, embedding) VALUES
  (1, 2, 'chunk close to [1,0,0]', '[0.9, 0.1, 0]'),
  (2, 3, 'chunk along z',          '[0, 0, 1]'),
  (3, 5, 'chunk not yet embedded', NULL);

SELECT setval('vector_unembedded_test.notes_chunks_id_seq', 3);

-- memos: same rows as notes' parents, no chunks table and no vector index,
-- so the planner has to read every row (including the NULL ones).
CREATE TABLE vector_unembedded_test.memos (
  id serial PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3)
);

INSERT INTO vector_unembedded_test.memos (id, title, embedding)
SELECT id, title, embedding FROM vector_unembedded_test.notes;

SELECT setval('vector_unembedded_test.memos_id_seq', 7);
