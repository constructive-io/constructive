-- Integration test seed for graphile-search (unified search plugin)
-- Exercises: tsvector, BM25 (pg_textsearch), pg_trgm, pgvector
--
-- Requires postgres-plus:18 image with: vector, pg_textsearch, pg_trgm

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_textsearch;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS unified_search_test;

-- ============================================================================
-- DOCUMENTS table — has columns for all 4 search algorithms
-- ============================================================================
CREATE TABLE unified_search_test.documents (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  tsv tsvector NOT NULL,
  embedding vector(3) NOT NULL
);

-- tsvector GIN index
CREATE INDEX idx_documents_tsv ON unified_search_test.documents USING gin(tsv);

-- pgvector cosine index
CREATE INDEX idx_documents_embedding ON unified_search_test.documents
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);

-- BM25 index on body column (pg_textsearch)
CREATE INDEX idx_documents_body_bm25 ON unified_search_test.documents
  USING bm25(body) WITH (text_config='english');

-- pg_trgm GIN index on title column
CREATE INDEX idx_documents_title_trgm ON unified_search_test.documents
  USING gin(title gin_trgm_ops);

-- ============================================================================
-- SEED DATA — 5 rows with known content for predictable search results
-- ============================================================================
INSERT INTO unified_search_test.documents (id, title, body, tsv, embedding) VALUES
  (1, 'Introduction to Machine Learning',
   'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data.',
   to_tsvector('english', 'machine learning subset artificial intelligence building systems learn data'),
   '[1, 0, 0]'),
  (2, 'Deep Learning with Neural Networks',
   'Deep learning uses neural networks with multiple layers to progressively extract higher-level features from raw input.',
   to_tsvector('english', 'deep learning neural networks multiple layers progressively extract features raw input'),
   '[0, 1, 0]'),
  (3, 'Natural Language Processing',
   'NLP combines computational linguistics with statistical and machine learning models to process human language.',
   to_tsvector('english', 'NLP computational linguistics statistical machine learning models process human language'),
   '[0, 0, 1]'),
  (4, 'Computer Vision and Image Recognition',
   'Computer vision enables machines to interpret and make decisions based on visual data from the real world.',
   to_tsvector('english', 'computer vision machines interpret decisions visual data real world'),
   '[0.707, 0.707, 0]'),
  (5, 'Reinforcement Learning in Robotics',
   'Reinforcement learning allows robots to learn optimal behaviors through trial and error in dynamic environments.',
   to_tsvector('english', 'reinforcement learning robots learn optimal behaviors trial error dynamic environments'),
   '[0.577, 0.577, 0.577]');

-- Reset sequence
SELECT setval('unified_search_test.documents_id_seq', 5);
