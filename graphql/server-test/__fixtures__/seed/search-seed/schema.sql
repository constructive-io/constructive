-- Schema creation for search-seed test scenario
-- Creates a table with tsvector, text (for trgm), and vector columns
-- to test the unified search plugin's mega queries

-- Create schema
CREATE SCHEMA IF NOT EXISTS "search_public";

-- Grant schema usage
GRANT USAGE ON SCHEMA "search_public" TO administrator, authenticated, anonymous;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA "search_public"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "search_public"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "search_public"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

-- =============================================================================
-- Table: articles
-- A simple content table with all the search-relevant column types:
-- - tsv (tsvector): for full-text search
-- - title, body (text): for pg_trgm fuzzy matching
-- - embedding (vector): for pgvector similarity search (if extension available)
-- =============================================================================
CREATE TABLE "search_public".articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  body text,
  tsv tsvector,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add vector column only if pgvector extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'ALTER TABLE "search_public".articles ADD COLUMN embedding vector(3)';
  END IF;
END
$$;

-- Create GIN index on tsvector column for full-text search
CREATE INDEX articles_tsv_idx ON "search_public".articles USING gin(tsv);

-- Create GIN index on title for trgm (speeds up similarity queries)
CREATE INDEX articles_title_trgm_idx ON "search_public".articles USING gin(title gin_trgm_ops);

-- Create GIN index on body for trgm
CREATE INDEX articles_body_trgm_idx ON "search_public".articles USING gin(body gin_trgm_ops);

-- Create timestamp trigger
CREATE TRIGGER articles_timestamps_tg
  BEFORE INSERT OR UPDATE ON "search_public".articles
  FOR EACH ROW EXECUTE PROCEDURE stamps.timestamps();

-- Auto-update tsvector column from title + body on insert/update
CREATE OR REPLACE FUNCTION "search_public".articles_tsv_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_tsv_update
  BEFORE INSERT OR UPDATE OF title, body ON "search_public".articles
  FOR EACH ROW EXECUTE PROCEDURE "search_public".articles_tsv_trigger();

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "search_public".articles TO administrator, authenticated, anonymous;
