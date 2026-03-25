import type { NodeTypeDefinition } from '../types';

export const DataPostGIS: NodeTypeDefinition = {
  name: 'DataPostGIS',
  slug: 'data_postgis',
  category: 'data',
  display_name: 'PostGIS Geometry',
  description: 'Adds a PostGIS geometry or geography column with a spatial index (GiST or SP-GiST). Supports configurable geometry types (Point, Polygon, etc.), SRID, and dimensionality. The graphile-postgis plugin auto-detects geometry/geography columns by codec type for spatial filtering (ST_Contains, ST_DWithin, bbox operators).',
  parameter_schema: {
      "type": "object",
      "properties": {
        "field_name": {
          "type": "string",
          "description": "Name of the geometry/geography column",
          "default": "geom"
        },
        "geometry_type": {
          "type": "string",
          "enum": [
            "Point",
            "LineString",
            "Polygon",
            "MultiPoint",
            "MultiLineString",
            "MultiPolygon",
            "GeometryCollection",
            "Geometry"
          ],
          "description": "PostGIS geometry type constraint",
          "default": "Point"
        },
        "srid": {
          "type": "integer",
          "description": "Spatial Reference System Identifier (e.g. 4326 for WGS84)",
          "default": 4326
        },
        "dimension": {
          "type": "integer",
          "enum": [
            2,
            3,
            4
          ],
          "description": "Coordinate dimension (2=XY, 3=XYZ, 4=XYZM)",
          "default": 2
        },
        "use_geography": {
          "type": "boolean",
          "description": "Use geography type instead of geometry (for geodetic calculations on the sphere)",
          "default": false
        },
        "index_method": {
          "type": "string",
          "enum": [
            "gist",
            "spgist"
          ],
          "description": "Spatial index method",
          "default": "gist"
        }
      }
    },
  tags: ['spatial', 'postgis', 'geometry', 'schema'],
};
