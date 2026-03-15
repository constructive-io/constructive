# graphile-postgis

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-postgis"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-postgis%2Fpackage.json"/></a>
</p>

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
