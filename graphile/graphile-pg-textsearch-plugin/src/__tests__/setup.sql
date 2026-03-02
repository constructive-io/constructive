-- Test setup for graphile-pg-textsearch-plugin integration tests
-- Creates pg_textsearch extension, test schema, tables, and BM25 indexes

-- Enable pg_textsearch extension
CREATE EXTENSION IF NOT EXISTS pg_textsearch;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS bm25_test;

-- Create test table with text columns for BM25 search
CREATE TABLE bm25_test.articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data with known content for predictable search results
INSERT INTO bm25_test.articles (title, body, category) VALUES
    ('PostgreSQL Full Text Search', 'PostgreSQL is a powerful open source relational database management system with advanced full text search capabilities.', 'database'),
    ('BM25 Ranking Algorithm', 'BM25 is a ranking function used by search engines to estimate the relevance of documents to a given search query. It is based on the probabilistic retrieval framework.', 'algorithms'),
    ('Introduction to Databases', 'A database is an organized collection of structured information or data stored electronically. Modern databases are managed by database management systems.', 'database'),
    ('Machine Learning Basics', 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.', 'ai'),
    ('Search Engine Architecture', 'Search engines use inverted indexes and ranking algorithms like BM25 to quickly find and rank relevant documents from large collections of text.', 'search');

-- Create BM25 index on the body column
CREATE INDEX articles_body_idx ON bm25_test.articles USING bm25(body) WITH (text_config='english');

-- Create BM25 index on the title column too
CREATE INDEX articles_title_idx ON bm25_test.articles USING bm25(title) WITH (text_config='english');
