-- Integration test seed for ConstructivePreset
-- Exercises: PostGIS, pgvector, tsvector (search plugin), BM25 (pg_textsearch),
--            scalar filters, relation filters, logical operators
--
-- Requires postgres-plus:18 image with: postgis, vector, pg_textsearch

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_textsearch;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS integration_test;

-- ============================================================================
-- CATEGORIES (parent table for relation filter tests)
-- ============================================================================
CREATE TABLE integration_test.categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text
);

CREATE INDEX idx_categories_name ON integration_test.categories(name);

-- ============================================================================
-- LOCATIONS (the main "kitchen sink" table)
-- ============================================================================
CREATE TABLE integration_test.locations (
  id serial PRIMARY KEY,
  name text NOT NULL,
  body text,
  category_id int REFERENCES integration_test.categories(id),
  geom geometry(Point, 4326),
  embedding vector(3) NOT NULL,
  tsv tsvector,
  is_active boolean NOT NULL DEFAULT true,
  rating numeric(3,1),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for relation filters and spatial queries
CREATE INDEX idx_locations_category_id ON integration_test.locations(category_id);
CREATE INDEX idx_locations_geom ON integration_test.locations USING gist(geom);
CREATE INDEX idx_locations_embedding ON integration_test.locations USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);
CREATE INDEX idx_locations_tsv ON integration_test.locations USING gin(tsv);

-- BM25 index on body column (requires pg_textsearch)
CREATE INDEX idx_locations_body_bm25 ON integration_test.locations USING bm25(body) WITH (text_config='english');

-- Trigram index on name column (requires pg_trgm) — enables fast fuzzy matching
CREATE INDEX idx_locations_name_trgm ON integration_test.locations USING gin(name gin_trgm_ops);

-- ============================================================================
-- TAGS (child table for backward relation filter tests)
-- ============================================================================
CREATE TABLE integration_test.tags (
  id serial PRIMARY KEY,
  location_id int NOT NULL REFERENCES integration_test.locations(id),
  label text NOT NULL
);

CREATE INDEX idx_tags_location_id ON integration_test.tags(location_id);

-- ============================================================================
-- VECTOR SEARCH FUNCTION
-- ============================================================================
CREATE FUNCTION integration_test.search_locations(
  query_embedding vector(3),
  result_limit INT DEFAULT 10
)
RETURNS SETOF integration_test.locations
LANGUAGE sql STABLE
AS $$
  SELECT l.*
  FROM integration_test.locations l
  ORDER BY l.embedding <=> query_embedding
  LIMIT result_limit;
$$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Categories
INSERT INTO integration_test.categories (id, name, description) VALUES
  (1, 'Restaurants', 'Places to eat'),
  (2, 'Parks', 'Outdoor green spaces'),
  (3, 'Museums', 'Cultural institutions');

-- Locations (each with geom, embedding, tsv, and body)
INSERT INTO integration_test.locations (id, name, body, category_id, geom, embedding, tsv, is_active, rating) VALUES
  (1, 'Central Park Cafe',
   'A cozy cafe in the heart of Central Park serving organic coffee and pastries',
   1,
   ST_SetSRID(ST_MakePoint(-73.968, 40.785), 4326),
   '[1, 0, 0]',
   to_tsvector('english', 'cozy cafe central park organic coffee pastries'),
   true, 4.5),
  (2, 'Brooklyn Bridge Park',
   'A scenic waterfront park with stunning views of the Manhattan skyline',
   2,
   ST_SetSRID(ST_MakePoint(-73.996, 40.698), 4326),
   '[0, 1, 0]',
   to_tsvector('english', 'scenic waterfront park stunning views manhattan skyline'),
   true, 4.8),
  (3, 'MoMA',
   'The Museum of Modern Art featuring contemporary and modern art collections',
   3,
   ST_SetSRID(ST_MakePoint(-73.978, 40.761), 4326),
   '[0, 0, 1]',
   to_tsvector('english', 'museum modern art contemporary collections'),
   true, 4.7),
  (4, 'Times Square Diner',
   'A classic American diner near Times Square open twenty four hours',
   1,
   ST_SetSRID(ST_MakePoint(-73.985, 40.758), 4326),
   '[0.707, 0.707, 0]',
   to_tsvector('english', 'classic american diner times square twenty four hours'),
   false, 3.2),
  (5, 'High Line Park',
   'An elevated linear park built on historic freight rail lines above the streets',
   2,
   ST_SetSRID(ST_MakePoint(-74.005, 40.748), 4326),
   '[0.577, 0.577, 0.577]',
   to_tsvector('english', 'elevated linear park historic freight rail lines streets'),
   true, 4.9),
  (6, 'Met Museum',
   'The Metropolitan Museum of Art with encyclopedic art collections spanning five thousand years',
   3,
   ST_SetSRID(ST_MakePoint(-73.963, 40.779), 4326),
   '[0, 0.707, 0.707]',
   to_tsvector('english', 'metropolitan museum art encyclopedic collections spanning five thousand years'),
   true, 4.6),
  (7, 'Prospect Park',
   'A large public park in Brooklyn designed by the creators of Central Park',
   2,
   ST_SetSRID(ST_MakePoint(-73.969, 40.660), 4326),
   '[0.333, 0.333, 0.333]',
   to_tsvector('english', 'large public park brooklyn creators central park'),
   true, NULL);

-- Tags (for backward relation filter tests)
INSERT INTO integration_test.tags (location_id, label) VALUES
  (1, 'food'),
  (1, 'coffee'),
  (2, 'outdoor'),
  (2, 'scenic'),
  (2, 'waterfront'),
  (3, 'indoor'),
  (3, 'art'),
  (4, 'food'),
  (4, 'late-night'),
  (5, 'outdoor'),
  (5, 'historic'),
  (6, 'indoor'),
  (6, 'art'),
  (7, 'outdoor');

-- Reset sequences
SELECT setval('integration_test.categories_id_seq', 3);
SELECT setval('integration_test.locations_id_seq', 7);
SELECT setval('integration_test.tags_id_seq', 14);
