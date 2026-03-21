-- Mega query integration seed for orm-test
-- Exercises: PostGIS, pgvector, tsvector, BM25 (pg_textsearch), pg_trgm,
--            scalar filters, relation filters, logical operators, M:N
--
-- Requires postgres-plus:18 image with: postgis, vector, pg_textsearch, pg_trgm

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_textsearch;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create test schema
CREATE SCHEMA IF NOT EXISTS mega_test;

-- Grant usage
GRANT USAGE ON SCHEMA mega_test TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mega_test GRANT ALL ON TABLES TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mega_test GRANT ALL ON SEQUENCES TO PUBLIC;

-- ============================================================================
-- CATEGORIES (parent table for relation filter tests)
-- ============================================================================
CREATE TABLE mega_test.categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text
);

CREATE INDEX idx_categories_name ON mega_test.categories(name);

-- ============================================================================
-- LOCATIONS (kitchen sink table: geom, embedding, tsv, BM25, trgm)
-- ============================================================================
CREATE TABLE mega_test.locations (
  id serial PRIMARY KEY,
  name text NOT NULL,
  body text,
  category_id int REFERENCES mega_test.categories(id),
  geom geometry(Point, 4326),
  embedding vector(3) NOT NULL,
  tsv tsvector,
  is_active boolean NOT NULL DEFAULT true,
  rating numeric(3,1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_category_id ON mega_test.locations(category_id);
CREATE INDEX idx_locations_geom ON mega_test.locations USING gist(geom);
CREATE INDEX idx_locations_embedding ON mega_test.locations USING ivfflat(embedding vector_cosine_ops) WITH (lists = 1);
CREATE INDEX idx_locations_tsv ON mega_test.locations USING gin(tsv);
CREATE INDEX idx_locations_body_bm25 ON mega_test.locations USING bm25(body) WITH (text_config='english');
CREATE INDEX idx_locations_name_trgm ON mega_test.locations USING gin(name gin_trgm_ops);

-- ============================================================================
-- TAGS (child table for backward relation filter + M:N tests)
-- ============================================================================
CREATE TABLE mega_test.tags (
  id serial PRIMARY KEY,
  location_id int NOT NULL REFERENCES mega_test.locations(id),
  label text NOT NULL
);

CREATE INDEX idx_tags_location_id ON mega_test.tags(location_id);

-- ============================================================================
-- M:N junction: locations <-> amenities via location_amenities
-- ============================================================================
CREATE TABLE mega_test.amenities (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE mega_test.location_amenities (
  id serial PRIMARY KEY,
  location_id int NOT NULL REFERENCES mega_test.locations(id) ON DELETE CASCADE,
  amenity_id int NOT NULL REFERENCES mega_test.amenities(id) ON DELETE CASCADE,
  UNIQUE(location_id, amenity_id)
);

COMMENT ON TABLE mega_test.location_amenities IS E'@behavior +manyToMany';

CREATE INDEX idx_location_amenities_location ON mega_test.location_amenities(location_id);
CREATE INDEX idx_location_amenities_amenity ON mega_test.location_amenities(amenity_id);

-- ============================================================================
-- VECTOR SEARCH FUNCTION
-- ============================================================================
CREATE FUNCTION mega_test.search_locations(
  query_embedding vector(3),
  result_limit INT DEFAULT 10
)
RETURNS SETOF mega_test.locations
LANGUAGE sql STABLE
AS $$
  SELECT l.*
  FROM mega_test.locations l
  ORDER BY l.embedding <=> query_embedding
  LIMIT result_limit;
$$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Categories
INSERT INTO mega_test.categories (id, name, description) VALUES
  (1, 'Restaurants', 'Places to eat'),
  (2, 'Parks', 'Outdoor green spaces'),
  (3, 'Museums', 'Cultural institutions');

-- Locations
--
-- Embedding semantics: dim 0 = restaurant/food, dim 1 = park/nature, dim 2 = museum/art.
-- This gives vector queries meaningful cluster behaviour.
--
-- Body texts are tuned so BM25 produces clear score separation:
--   • "park" query  → Prospect Park dominates (3× "park" in a short body)
--   • "museum art"  → MoMA edges out Met Museum (more concentrated terms)
--   • "cafe coffee" → Central Park Cafe is the sole match
--
INSERT INTO mega_test.locations (id, name, body, category_id, geom, embedding, tsv, is_active, rating) VALUES
  (1, 'Central Park Cafe',
   'A cozy cafe in the heart of Central Park with organic coffee, fresh pastries, and beautiful park-side seating',
   1,
   ST_SetSRID(ST_MakePoint(-73.968, 40.785), 4326),
   '[1, 0, 0]',
   to_tsvector('english', 'cozy cafe central park organic coffee fresh pastries beautiful park-side seating'),
   true, 4.5),
  (2, 'Brooklyn Bridge Park',
   'A scenic waterfront park with stunning views of the Manhattan skyline and playgrounds along the East River',
   2,
   ST_SetSRID(ST_MakePoint(-73.996, 40.698), 4326),
   '[0, 1, 0]',
   to_tsvector('english', 'scenic waterfront park stunning views manhattan skyline playgrounds east river'),
   true, 4.8),
  (3, 'MoMA',
   'The Museum of Modern Art is a world-renowned institution of contemporary art and modern art, housing paintings, sculptures, film, and groundbreaking design',
   3,
   ST_SetSRID(ST_MakePoint(-73.978, 40.761), 4326),
   '[0, 0, 1]',
   to_tsvector('english', 'museum modern art world-renowned institution contemporary art modern art paintings sculptures film groundbreaking design'),
   true, 4.7),
  (4, 'Times Square Diner',
   'A classic American diner in the bustling heart of Times Square serving breakfast around the clock',
   1,
   ST_SetSRID(ST_MakePoint(-73.985, 40.758), 4326),
   '[0.8, 0.6, 0]',
   to_tsvector('english', 'classic american diner bustling heart times square serving breakfast around clock'),
   false, 3.2),
  (5, 'High Line Park',
   'An elevated linear park on a historic freight rail line with gardens, art installations, and sweeping Hudson River views',
   2,
   ST_SetSRID(ST_MakePoint(-74.005, 40.748), 4326),
   '[0.3, 0.7, 0.3]',
   to_tsvector('english', 'elevated linear park historic freight rail line gardens art installations sweeping hudson river views'),
   true, 4.9),
  (6, 'Met Museum',
   'The Metropolitan Museum of Art spans five thousand years of art from every corner of the world, with over two million works of art in its collection',
   3,
   ST_SetSRID(ST_MakePoint(-73.963, 40.779), 4326),
   '[0.1, 0.1, 0.9]',
   to_tsvector('english', 'metropolitan museum art five thousand years art every corner world two million works art collection'),
   true, 4.6),
  (7, 'Prospect Park',
   'A sprawling urban park designed by Olmsted and Vaux, this beloved Brooklyn park features a lake, meadows, wooded ravines, and miles of park trails',
   2,
   ST_SetSRID(ST_MakePoint(-73.969, 40.660), 4326),
   '[0.1, 0.9, 0.1]',
   to_tsvector('english', 'sprawling urban park designed olmsted vaux beloved brooklyn park features lake meadows wooded ravines miles park trails'),
   true, NULL);

-- Tags (backward relation filter)
INSERT INTO mega_test.tags (location_id, label) VALUES
  (1, 'food'), (1, 'coffee'),
  (2, 'outdoor'), (2, 'scenic'), (2, 'waterfront'),
  (3, 'indoor'), (3, 'art'),
  (4, 'food'), (4, 'late-night'),
  (5, 'outdoor'), (5, 'historic'),
  (6, 'indoor'), (6, 'art'),
  (7, 'outdoor');

-- Amenities (M:N junction data)
INSERT INTO mega_test.amenities (id, name) VALUES
  (1, 'WiFi'), (2, 'Parking'), (3, 'Restrooms'), (4, 'Gift Shop');

INSERT INTO mega_test.location_amenities (location_id, amenity_id) VALUES
  (1, 1), (1, 3),           -- Central Park Cafe: WiFi, Restrooms
  (2, 2), (2, 3),           -- Brooklyn Bridge Park: Parking, Restrooms
  (3, 1), (3, 3), (3, 4),   -- MoMA: WiFi, Restrooms, Gift Shop
  (5, 3),                    -- High Line Park: Restrooms
  (6, 1), (6, 3), (6, 4);   -- Met Museum: WiFi, Restrooms, Gift Shop

-- Reset sequences
SELECT setval('mega_test.categories_id_seq', 3);
SELECT setval('mega_test.locations_id_seq', 7);
SELECT setval('mega_test.tags_id_seq', 14);
SELECT setval('mega_test.amenities_id_seq', 4);
SELECT setval('mega_test.location_amenities_id_seq', 11);
