-- Integration test seed for graphile-llm
-- Exercises: schema enrichment (text fields on VectorNearbyInput and mutation inputs)
-- and optional real Ollama embedding when available.
--
-- Requires postgres-plus:18 image with: vector

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS llm_test;

-- ============================================================================
-- ARTICLES table — has a vector column for embedding
-- ============================================================================
CREATE TABLE llm_test.articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  embedding vector(3) NOT NULL
);

-- pgvector cosine index
CREATE INDEX idx_articles_embedding ON llm_test.articles
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);

-- ============================================================================
-- SEED DATA — 5 rows with known content for predictable search results
-- ============================================================================
INSERT INTO llm_test.articles (id, title, body, embedding) VALUES
  (1, 'Introduction to Machine Learning',
   'Machine learning is a subset of artificial intelligence.',
   '[1, 0, 0]'),
  (2, 'Deep Learning with Neural Networks',
   'Deep learning uses neural networks with multiple layers.',
   '[0, 1, 0]'),
  (3, 'Natural Language Processing',
   'NLP combines computational linguistics with machine learning.',
   '[0, 0, 1]'),
  (4, 'Computer Vision',
   'Computer vision enables machines to interpret visual data.',
   '[0.707, 0.707, 0]'),
  (5, 'Reinforcement Learning',
   'Reinforcement learning allows agents to learn through trial and error.',
   '[0.577, 0.577, 0.577]');

SELECT setval('llm_test.articles_id_seq', 5);
