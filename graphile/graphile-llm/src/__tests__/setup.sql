-- Integration test seed for graphile-llm
-- Exercises: schema enrichment (text fields on VectorNearbyInput and mutation inputs),
-- RAG plugin (ragQuery / embedText fields), and optional real Ollama embedding.
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
-- ARTICLES_CHUNKS table — chunk fragments for RAG testing
-- Linked to articles via parent_id. Tagged with @hasChunks on articles codec.
-- ============================================================================
CREATE TABLE llm_test.articles_chunks (
  id serial PRIMARY KEY,
  parent_id integer NOT NULL REFERENCES llm_test.articles(id),
  content text NOT NULL,
  embedding vector(3) NOT NULL
);

-- pgvector cosine index on chunks
CREATE INDEX idx_articles_chunks_embedding ON llm_test.articles_chunks
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);

-- ============================================================================
-- SEED DATA — articles
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

-- ============================================================================
-- SEED DATA — chunks (each article gets 2 chunks for RAG context assembly)
-- ============================================================================
INSERT INTO llm_test.articles_chunks (id, parent_id, content, embedding) VALUES
  (1, 1, 'Machine learning is a subset of artificial intelligence that focuses on algorithms.',
   '[0.95, 0.05, 0]'),
  (2, 1, 'Supervised and unsupervised learning are the two main types of ML.',
   '[0.9, 0.1, 0]'),
  (3, 2, 'Deep learning uses neural networks with multiple hidden layers.',
   '[0.05, 0.95, 0]'),
  (4, 2, 'CNNs and RNNs are common deep learning architectures.',
   '[0.1, 0.9, 0]'),
  (5, 3, 'NLP enables computers to understand and generate human language.',
   '[0, 0.05, 0.95]'),
  (6, 3, 'Transformers have revolutionized NLP with attention mechanisms.',
   '[0, 0.1, 0.9]');

SELECT setval('llm_test.articles_chunks_id_seq', 6);
