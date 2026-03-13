-- Test setup for graphile-trgm integration tests
-- Creates pg_trgm extension, test schema, tables, and trigram indexes

-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS trgm_test;

-- Create test table with text columns for fuzzy matching
CREATE TABLE trgm_test.products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data with known content for predictable fuzzy matches
INSERT INTO trgm_test.products (name, description, category) VALUES
    ('PostgreSQL Database', 'A powerful open source relational database management system', 'database'),
    ('MySQL Server', 'Popular open source database server for web applications', 'database'),
    ('MongoDB Atlas', 'Cloud-hosted NoSQL document database for modern apps', 'database'),
    ('Redis Cache', 'In-memory data structure store used as cache and message broker', 'cache'),
    ('Elasticsearch', 'Distributed search and analytics engine for all types of data', 'search'),
    ('Central Park Cafe', 'A cozy cafe in the heart of Central Park serving organic coffee', 'restaurant'),
    ('Brooklyn Bridge Park', 'A scenic waterfront park with stunning views of Manhattan', 'park');

-- Create GIN trigram index on name column for fast fuzzy matching
CREATE INDEX products_name_trgm_idx ON trgm_test.products USING gin(name gin_trgm_ops);

-- Create GIN trigram index on description column too
CREATE INDEX products_desc_trgm_idx ON trgm_test.products USING gin(description gin_trgm_ops);
