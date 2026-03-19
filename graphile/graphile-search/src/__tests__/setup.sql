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

-- ============================================================================
-- ARTICLES table — for @searchConfig integration tests
-- Has tsvector + vector + updated_at for recency boost testing
-- ============================================================================
CREATE TABLE unified_search_test.articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  tsv tsvector NOT NULL,
  embedding vector(3) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_tsv ON unified_search_test.articles USING gin(tsv);
CREATE INDEX idx_articles_embedding ON unified_search_test.articles
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);

-- BM25 index on body column
CREATE INDEX idx_articles_body_bm25 ON unified_search_test.articles
  USING bm25(body) WITH (text_config='english');

-- pg_trgm GIN index on title column
CREATE INDEX idx_articles_title_trgm ON unified_search_test.articles
  USING gin(title gin_trgm_ops);

INSERT INTO unified_search_test.articles (id, title, body, tsv, embedding, updated_at) VALUES
  (1, 'Guide to PostgreSQL',
   'PostgreSQL is a powerful open source relational database system with strong extensibility.',
   to_tsvector('english', 'postgresql powerful open source relational database system extensibility'),
   '[1, 0, 0]',
   '2025-01-01T00:00:00Z'),
  (2, 'Advanced SQL Patterns',
   'Advanced SQL patterns include window functions, CTEs, and recursive queries for complex data analysis.',
   to_tsvector('english', 'advanced sql patterns window functions CTEs recursive queries complex data analysis'),
   '[0, 1, 0]',
   '2025-06-01T00:00:00Z'),
  (3, 'Database Indexing Strategies',
   'Proper indexing is crucial for database performance. B-tree, GIN, and GiST indexes serve different purposes.',
   to_tsvector('english', 'indexing crucial database performance b-tree GIN GiST indexes different purposes'),
   '[0, 0, 1]',
   '2026-01-01T00:00:00Z');

SELECT setval('unified_search_test.articles_id_seq', 3);

-- ============================================================================
-- POSTS table + POSTS_CHUNKS table — for @hasChunks integration tests
-- Parent table has an embedding; chunks table has fragment embeddings
-- ============================================================================
CREATE TABLE unified_search_test.posts (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  tsv tsvector NOT NULL,
  embedding vector(3) NOT NULL
);

CREATE INDEX idx_posts_tsv ON unified_search_test.posts USING gin(tsv);
CREATE INDEX idx_posts_embedding ON unified_search_test.posts
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);

CREATE TABLE unified_search_test.posts_chunks (
  id serial PRIMARY KEY,
  post_id integer NOT NULL REFERENCES unified_search_test.posts(id),
  chunk_text text NOT NULL,
  embedding vector(3) NOT NULL
);

CREATE INDEX idx_posts_chunks_embedding ON unified_search_test.posts_chunks
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);

-- Seed posts: parent embeddings are approximate; chunks have more specific embeddings
INSERT INTO unified_search_test.posts (id, title, body, tsv, embedding) VALUES
  (1, 'Intro to Vector Search',
   'Vector search uses embeddings to find semantically similar content.',
   to_tsvector('english', 'vector search embeddings semantically similar content'),
   '[0.5, 0.5, 0]'),
  (2, 'Chunk-Based Retrieval',
   'Breaking documents into chunks improves retrieval accuracy for long texts.',
   to_tsvector('english', 'chunk based retrieval documents chunks accuracy long texts'),
   '[0, 0.5, 0.5]');

SELECT setval('unified_search_test.posts_id_seq', 2);

-- Chunks for post 1: one chunk very close to [1,0,0], one moderately close
INSERT INTO unified_search_test.posts_chunks (id, post_id, chunk_text, embedding) VALUES
  (1, 1, 'First chunk about vectors and similarity',     '[0.95, 0.05, 0]'),
  (2, 1, 'Second chunk about search algorithms',          '[0.3, 0.7, 0]'),
  (3, 2, 'First chunk about document chunking strategies', '[0.1, 0.1, 0.9]'),
  (4, 2, 'Second chunk about retrieval methods',           '[0.2, 0.8, 0.1]');

SELECT setval('unified_search_test.posts_chunks_id_seq', 4);
