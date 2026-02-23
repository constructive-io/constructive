# graphile-postgis

PostGIS support for PostGraphile v5.

Automatically generates GraphQL types for PostGIS geometry and geography columns, including GeoJSON scalar types, dimension-aware interfaces, and subtype-specific fields (coordinates, points, rings, etc.).

## Installation

```bash
npm install graphile-postgis
```

## Usage

```typescript
import { GraphilePostgisPreset } from 'graphile-postgis';

const preset = {
  extends: [GraphilePostgisPreset]
};
```

## Features

- GeoJSON scalar type for input/output
- GraphQL interfaces for geometry and geography base types
- Dimension-aware interfaces (XY, XYZ, XYM, XYZM)
- Concrete types for all geometry subtypes: Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection
- Subtype-specific fields (x/y/z for Points, points for LineStrings, exterior/interiors for Polygons, etc.)
- Geography-aware field naming (longitude/latitude/height instead of x/y/z)
- Graceful degradation when PostGIS is not installed

## License

MIT
