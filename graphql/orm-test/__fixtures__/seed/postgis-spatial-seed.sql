-- PostGIS spatial filter integration seed for orm-test.
--
-- Exercises every ORM-exposed PostGIS spatial filter operator across every
-- concrete geometry subtype plus the geography codec. Acts as a regression
-- guard for constructive-io/constructive-planning#724 (GeoJSON input of
-- spatial filters must be wrapped with ST_GeomFromGeoJSON in the generated
-- SQL).
--
-- Requires postgres-plus image with the `postgis` extension.
-- Extensions are installed via pgsql-test db.extensions config (not inline).

CREATE SCHEMA IF NOT EXISTS postgis_test;

GRANT USAGE ON SCHEMA postgis_test TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA postgis_test GRANT ALL ON TABLES TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA postgis_test GRANT ALL ON SEQUENCES TO PUBLIC;

-- ============================================================================
-- GEOMETRY CODEC — one table per concrete subtype
-- ============================================================================

-- Point: 6 US cities. `secondary_loc` is nullable to drive isNull tests.
CREATE TABLE postgis_test.cities_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  loc geometry(Point, 4326) NOT NULL,
  secondary_loc geometry(Point, 4326)
);
CREATE INDEX idx_cities_geom_loc ON postgis_test.cities_geom USING gist(loc);
CREATE INDEX idx_cities_geom_secondary_loc ON postgis_test.cities_geom USING gist(secondary_loc);

-- Polygon: 4 bounded regions with known containment relationships.
CREATE TABLE postgis_test.regions_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  shape geometry(Polygon, 4326) NOT NULL
);
CREATE INDEX idx_regions_geom_shape ON postgis_test.regions_geom USING gist(shape);

-- MultiPolygon: 2 disjoint multi-region shapes (west-coast metros, east-coast metros).
CREATE TABLE postgis_test.territories_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  regions geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX idx_territories_geom_regions ON postgis_test.territories_geom USING gist(regions);

-- LineString: 2 multi-vertex routes (I-5 corridor and transcontinental).
CREATE TABLE postgis_test.routes_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  path geometry(LineString, 4326) NOT NULL
);
CREATE INDEX idx_routes_geom_path ON postgis_test.routes_geom USING gist(path);

-- MultiPoint: 2 point bags (west-coast, east-coast).
CREATE TABLE postgis_test.swarms_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  points geometry(MultiPoint, 4326) NOT NULL
);
CREATE INDEX idx_swarms_geom_points ON postgis_test.swarms_geom USING gist(points);

-- MultiLineString: 2 multi-line networks (bay-area transit, east-coast rail).
CREATE TABLE postgis_test.networks_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  paths geometry(MultiLineString, 4326) NOT NULL
);
CREATE INDEX idx_networks_geom_paths ON postgis_test.networks_geom USING gist(paths);

-- GeometryCollection: 2 heterogeneous bags (mixed shapes).
CREATE TABLE postgis_test.collections_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  shapes geometry(GeometryCollection, 4326) NOT NULL
);
CREATE INDEX idx_collections_geom_shapes ON postgis_test.collections_geom USING gist(shapes);

-- PointZ: 2 altitude-aware points so intersects3D has a real column to hit.
CREATE TABLE postgis_test.towers_geom (
  id serial PRIMARY KEY,
  name text NOT NULL,
  loc3d geometry(PointZ, 4326) NOT NULL
);
CREATE INDEX idx_towers_geom_loc3d ON postgis_test.towers_geom USING gist(loc3d);

-- ============================================================================
-- GEOGRAPHY CODEC — Point + Polygon (the only codec shapes the operator set
-- registers for; see graphile-postgis FUNCTION_SPECS / OPERATOR_SPECS).
-- ============================================================================

CREATE TABLE postgis_test.cities_geog (
  id serial PRIMARY KEY,
  name text NOT NULL,
  loc geography(Point, 4326) NOT NULL
);
CREATE INDEX idx_cities_geog_loc ON postgis_test.cities_geog USING gist(loc);

CREATE TABLE postgis_test.regions_geog (
  id serial PRIMARY KEY,
  name text NOT NULL,
  shape geography(Polygon, 4326) NOT NULL
);
CREATE INDEX idx_regions_geog_shape ON postgis_test.regions_geog USING gist(shape);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Cities (geometry): id 1..6 = SF, Oakland, LA, NY, Seattle, Chicago.
-- Two rows have a non-null secondary_loc (SF, Oakland) so isNull partitions
-- the table evenly enough to be meaningful.
INSERT INTO postgis_test.cities_geom (id, name, loc, secondary_loc) VALUES
  (1, 'San Francisco', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
                       ST_SetSRID(ST_MakePoint(-122.4783, 37.8199), 4326)),
  (2, 'Oakland',       ST_SetSRID(ST_MakePoint(-122.2712, 37.8044), 4326),
                       ST_SetSRID(ST_MakePoint(-122.2585, 37.8024), 4326)),
  (3, 'Los Angeles',   ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), NULL),
  (4, 'New York',      ST_SetSRID(ST_MakePoint( -74.0060, 40.7128), 4326), NULL),
  (5, 'Seattle',       ST_SetSRID(ST_MakePoint(-122.3321, 47.6062), 4326), NULL),
  (6, 'Chicago',       ST_SetSRID(ST_MakePoint( -87.6298, 41.8781), 4326), NULL);

-- Cities (geography): same coordinates, geography codec.
INSERT INTO postgis_test.cities_geog (id, name, loc) VALUES
  (1, 'San Francisco', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography),
  (2, 'Oakland',       ST_SetSRID(ST_MakePoint(-122.2712, 37.8044), 4326)::geography),
  (3, 'Los Angeles',   ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography),
  (4, 'New York',      ST_SetSRID(ST_MakePoint( -74.0060, 40.7128), 4326)::geography),
  (5, 'Seattle',       ST_SetSRID(ST_MakePoint(-122.3321, 47.6062), 4326)::geography),
  (6, 'Chicago',       ST_SetSRID(ST_MakePoint( -87.6298, 41.8781), 4326)::geography);

-- Regions (geometry): bounding rectangles.
-- Bay Area covers SF + Oakland, NYC Metro covers NY, West Coast Strip covers
-- SF + Oakland + LA + Seattle, Pacific Ocean contains no cities.
INSERT INTO postgis_test.regions_geom (id, name, shape) VALUES
  (1, 'Bay Area',         ST_GeomFromText('POLYGON((-122.55 37.70, -122.20 37.70, -122.20 37.85, -122.55 37.85, -122.55 37.70))', 4326)),
  (2, 'NYC Metro',        ST_GeomFromText('POLYGON((-74.15 40.60, -73.70 40.60, -73.70 40.90, -74.15 40.90, -74.15 40.60))', 4326)),
  (3, 'West Coast Strip', ST_GeomFromText('POLYGON((-122.55 32.00, -117.00 32.00, -117.00 49.00, -122.55 49.00, -122.55 32.00))', 4326)),
  (4, 'Pacific Ocean',    ST_GeomFromText('POLYGON((-135 15, -125 15, -125 40, -135 40, -135 15))', 4326));

-- Regions (geography): same shapes on the geography codec.
INSERT INTO postgis_test.regions_geog (id, name, shape) VALUES
  (1, 'Bay Area',         ST_GeomFromText('POLYGON((-122.55 37.70, -122.20 37.70, -122.20 37.85, -122.55 37.85, -122.55 37.70))', 4326)::geography),
  (2, 'NYC Metro',        ST_GeomFromText('POLYGON((-74.15 40.60, -73.70 40.60, -73.70 40.90, -74.15 40.90, -74.15 40.60))', 4326)::geography),
  (3, 'West Coast Strip', ST_GeomFromText('POLYGON((-122.55 32.00, -117.00 32.00, -117.00 49.00, -122.55 49.00, -122.55 32.00))', 4326)::geography),
  (4, 'Pacific Ocean',    ST_GeomFromText('POLYGON((-135 15, -125 15, -125 40, -135 40, -135 15))', 4326)::geography);

-- Territories (MultiPolygon): 3-part west-coast (Bay Area + LA Basin +
-- Seattle Area) and 3-part east-coast (NYC Metro + DC area + Boston area).
INSERT INTO postgis_test.territories_geom (id, name, regions) VALUES
  (1, 'West Coast Metros', ST_GeomFromText(
    'MULTIPOLYGON(((-122.55 37.70, -122.20 37.70, -122.20 37.85, -122.55 37.85, -122.55 37.70)),
                  ((-119.00 33.00, -117.00 33.00, -117.00 35.00, -119.00 35.00, -119.00 33.00)),
                  ((-123.00 47.00, -121.00 47.00, -121.00 48.00, -123.00 48.00, -123.00 47.00)))', 4326)),
  (2, 'East Coast Metros', ST_GeomFromText(
    'MULTIPOLYGON(((-74.15 40.60, -73.70 40.60, -73.70 40.90, -74.15 40.90, -74.15 40.60)),
                  ((-77.20 38.80, -76.90 38.80, -76.90 39.00, -77.20 39.00, -77.20 38.80)),
                  ((-71.20 42.30, -71.00 42.30, -71.00 42.40, -71.20 42.40, -71.20 42.30)))', 4326));

-- Routes (LineString).
-- I-5 Corridor: SF → LA → Seattle (zig-zag, bbox spans whole west coast).
-- Transcontinental: SF → Chicago → NY (bbox spans full continental US).
INSERT INTO postgis_test.routes_geom (id, name, path) VALUES
  (1, 'I-5 Corridor',     ST_GeomFromText('LINESTRING(-122.4194 37.7749, -118.2437 34.0522, -122.3321 47.6062)', 4326)),
  (2, 'Transcontinental', ST_GeomFromText('LINESTRING(-122.4194 37.7749,  -87.6298 41.8781,  -74.0060 40.7128)', 4326));

-- Swarms (MultiPoint).
INSERT INTO postgis_test.swarms_geom (id, name, points) VALUES
  (1, 'West Coast Swarm', ST_GeomFromText('MULTIPOINT((-122.4194 37.7749), (-118.2437 34.0522), (-122.3321 47.6062))', 4326)),
  (2, 'East Coast Swarm', ST_GeomFromText('MULTIPOINT(( -74.0060 40.7128), ( -77.0369 38.9072), ( -71.0589 42.3601))', 4326));

-- Networks (MultiLineString).
-- Bay Area Transit is a pair of short lines around SF/Oakland (both lie
-- inside the Bay Area region polygon).
-- East Coast Rail connects NY→DC and NY→Boston.
INSERT INTO postgis_test.networks_geom (id, name, paths) VALUES
  (1, 'Bay Area Transit', ST_GeomFromText(
    'MULTILINESTRING((-122.4194 37.7749, -122.2712 37.8044),
                     (-122.4783 37.8199, -122.2585 37.8024))', 4326)),
  (2, 'East Coast Rail',  ST_GeomFromText(
    'MULTILINESTRING(( -74.0060 40.7128,  -77.0369 38.9072),
                     ( -74.0060 40.7128,  -71.0589 42.3601))', 4326));

-- Collections (GeometryCollection) — heterogeneous shape bags.
INSERT INTO postgis_test.collections_geom (id, name, shapes) VALUES
  (1, 'West Coast Mix', ST_GeomFromText(
    'GEOMETRYCOLLECTION(
      POINT(-122.4194 37.7749),
      POLYGON((-122.55 37.70, -122.20 37.70, -122.20 37.85, -122.55 37.85, -122.55 37.70)),
      LINESTRING(-122.4194 37.7749, -118.2437 34.0522)
    )', 4326)),
  (2, 'East Coast Mix', ST_GeomFromText(
    'GEOMETRYCOLLECTION(
      POINT(-74.0060 40.7128),
      POLYGON((-74.15 40.60, -73.70 40.60, -73.70 40.90, -74.15 40.90, -74.15 40.60))
    )', 4326));

-- Towers (PointZ): real SF structures with altitude in metres.
INSERT INTO postgis_test.towers_geom (id, name, loc3d) VALUES
  (1, 'Sutro Tower',       ST_SetSRID(ST_MakePoint(-122.4528, 37.7552, 254), 4326)),
  (2, 'Salesforce Tower',  ST_SetSRID(ST_MakePoint(-122.3975, 37.7895, 326), 4326));

-- Reset sequences.
SELECT setval('postgis_test.cities_geom_id_seq',       6);
SELECT setval('postgis_test.cities_geog_id_seq',       6);
SELECT setval('postgis_test.regions_geom_id_seq',      4);
SELECT setval('postgis_test.regions_geog_id_seq',      4);
SELECT setval('postgis_test.territories_geom_id_seq',  2);
SELECT setval('postgis_test.routes_geom_id_seq',       2);
SELECT setval('postgis_test.swarms_geom_id_seq',       2);
SELECT setval('postgis_test.networks_geom_id_seq',     2);
SELECT setval('postgis_test.collections_geom_id_seq',  2);
SELECT setval('postgis_test.towers_geom_id_seq',       2);
