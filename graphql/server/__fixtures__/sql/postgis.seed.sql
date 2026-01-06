BEGIN;

CREATE TABLE IF NOT EXISTS app_public.geo_points (
  id serial PRIMARY KEY,
  name text,
  geom geometry(Point, 4326),
  location geolocation,
  area geopolygon
);

INSERT INTO app_public.geo_points (name, geom, location, area)
VALUES (
  'sample',
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
  ST_SetSRID(
    ST_GeomFromText('POLYGON((-122.5 37.7, -122.4 37.7, -122.4 37.8, -122.5 37.8, -122.5 37.7))'),
    4326
  )
);

GRANT SELECT ON app_public.geo_points TO anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.geo_points TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.geo_points TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO administrator;

COMMIT;
