-- Test data for search-seed scenario
-- Inserts articles with varied content for search testing
-- The tsvector column is auto-populated by the trigger

-- Insert test articles with searchable content
INSERT INTO "search_public".articles (id, title, body)
VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    'Introduction to Machine Learning',
    'Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. Deep learning uses neural networks with many layers.'
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    'PostgreSQL Full-Text Search',
    'PostgreSQL provides powerful full-text search capabilities using tsvector and tsquery. The ts_rank function scores relevance of search results.'
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    'GraphQL API Design Patterns',
    'Building robust GraphQL APIs requires careful schema design. Connection-based pagination, filtering, and ordering are essential patterns for production APIs.'
  ),
  (
    'a0000001-0000-0000-0000-000000000004',
    'Vector Databases and Embeddings',
    'Vector databases store high-dimensional embeddings for similarity search. Cosine distance and L2 distance are common metrics for comparing vectors.'
  ),
  (
    'a0000001-0000-0000-0000-000000000005',
    'Fuzzy Text Matching with Trigrams',
    'Trigram-based fuzzy matching tolerates typos and misspellings. The pg_trgm extension in PostgreSQL provides similarity and word_similarity functions.'
  );

-- Update vector embeddings only if pgvector extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE $e$
      UPDATE "search_public".articles SET embedding = '[0.1, 0.9, 0.3]'::vector WHERE id = 'a0000001-0000-0000-0000-000000000001';
      UPDATE "search_public".articles SET embedding = '[0.8, 0.2, 0.5]'::vector WHERE id = 'a0000001-0000-0000-0000-000000000002';
      UPDATE "search_public".articles SET embedding = '[0.4, 0.6, 0.7]'::vector WHERE id = 'a0000001-0000-0000-0000-000000000003';
      UPDATE "search_public".articles SET embedding = '[0.9, 0.1, 0.8]'::vector WHERE id = 'a0000001-0000-0000-0000-000000000004';
      UPDATE "search_public".articles SET embedding = '[0.3, 0.5, 0.2]'::vector WHERE id = 'a0000001-0000-0000-0000-000000000005';
    $e$;
  END IF;
END
$$;
