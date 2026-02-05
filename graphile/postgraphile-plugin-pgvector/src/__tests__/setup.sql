-- Test setup for pgvector plugin tests
-- This creates the pgvector extension and a test table with vector embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS pgvector_test;

-- Create test documents table with vector column
-- Using 3 dimensions for simplicity in tests
CREATE TABLE pgvector_test.documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    embedding vector(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data with known vectors for predictable distance calculations
-- Vector [1, 0, 0] - unit vector along x-axis
INSERT INTO pgvector_test.documents (title, content, embedding) VALUES
    ('Document A', 'First test document', '[1, 0, 0]'),
    ('Document B', 'Second test document', '[0, 1, 0]'),
    ('Document C', 'Third test document', '[0, 0, 1]'),
    ('Document D', 'Fourth test document', '[0.707, 0.707, 0]'),
    ('Document E', 'Fifth test document', '[0.577, 0.577, 0.577]');

-- Create an index for performance (optional but good practice)
CREATE INDEX idx_documents_embedding ON pgvector_test.documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1);
