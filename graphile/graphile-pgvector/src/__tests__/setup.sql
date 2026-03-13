-- Test setup for graphile-pgvector integration tests
-- Creates pgvector extension, test schema, tables, and functions

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS pgvector_test;

-- Create test table with vector column (3 dimensions for simplicity)
CREATE TABLE pgvector_test.documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    embedding vector(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data with known vectors for predictable distance calculations
INSERT INTO pgvector_test.documents (title, content, embedding) VALUES
    ('Document A', 'First test document', '[1, 0, 0]'),
    ('Document B', 'Second test document', '[0, 1, 0]'),
    ('Document C', 'Third test document', '[0, 0, 1]'),
    ('Document D', 'Fourth test document', '[0.707, 0.707, 0]'),
    ('Document E', 'Fifth test document', '[0.577, 0.577, 0.577]');

-- Create a vector search function to test function exposure
CREATE FUNCTION pgvector_test.search_documents(
    query_embedding vector(3),
    result_limit INT DEFAULT 5
)
RETURNS SETOF pgvector_test.documents
LANGUAGE sql STABLE
AS $$
    SELECT d.*
    FROM pgvector_test.documents d
    ORDER BY d.embedding <=> query_embedding
    LIMIT result_limit;
$$;

-- Create an index for performance (optional but good practice)
CREATE INDEX idx_documents_embedding ON pgvector_test.documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1);
