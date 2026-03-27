# graphile-postgis Development

## Overview

The `graphile-postgis` package lives at `graphile/graphile-postgis/` in the constructive monorepo. It provides PostGIS support for PostGraphile v5 — GeoJSON types, spatial filter operators, measurement fields, transformation fields, and aggregate function definitions.

## Architecture

### Plugin Structure

All plugins are in `src/plugins/` and follow the `GraphileConfig.Plugin` pattern:

- **codec.ts** — GeoJSON scalar type codec
- **inflection.ts** — Type naming for subtypes, Z/M variants (e.g., `GeometryPointZ`)
- **detect-extension.ts** — Auto-detects PostGIS extension in the database
- **register-types.ts** — Registers 56 concrete GraphQL types (geometry/geography × 7 subtypes × 4 dimension variants)
- **geometry-fields.ts** — Coordinate fields (x, y, z, points, exterior/interiors)
- **measurement-fields.ts** — `area`, `length`, `perimeter` (client-side geodesic calculations)
- **transformation-functions.ts** — `centroid`, `bbox`, `numPoints` (client-side from GeoJSON)
- **aggregate-functions.ts** — Definitions for ST_Extent, ST_Union, ST_Collect, ST_ConvexHull
- **connection-filter-operators.ts** — 26 spatial filter operators via declarative factory API
- **within-distance-operator.ts** — `withinDistance` (ST_DWithin) compound input type operator

### Connection Filter Operator Factory Pattern

Custom operators are registered via `connectionFilterOperatorFactories` in the preset's schema options. Each factory is a function that receives the `build` object and returns an array of operator registrations:

```typescript
export function createMyOperatorFactory(): ConnectionFilterOperatorFactory {
  return (build) => {
    if (!build.pgGISExtensionInfo) return [];
    // Return array of { typeNames, operatorName, spec } registrations
  };
}
```

The `connectionFilterOperatorFactories` type is augmented by `graphile-connection-filter` (not a direct dependency of graphile-postgis), so preset.ts uses a type assertion: `as GraphileConfig.Preset['schema'] & Record<string, unknown>`.

### Key Build Object Properties

- `build.pgGISExtensionInfo` — Set by detect-extension plugin: `{ schemaName, geometryCodec, geographyCodec }`
- `build.inflection.gisType(...)` / `build.inflection.gisInterfaceName(...)` — Generate type names
- `build.getTypeByName('GeoJSON')` — Get the GeoJSON scalar type

## Testing

### Prerequisites

```bash
# Start Docker DB with PostGIS support
pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate
eval "$(pgpm env)"
pgpm admin-users bootstrap --yes
pgpm admin-users add --test --yes
```

### Running Tests

```bash
cd graphile/graphile-postgis

# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

### Test Status Notes

- 4 test suites (preset, index, connection-filter-operators, within-distance-operator) import `connection-filter-operators.ts` which depends on `graphile-connection-filter`. Since that's not a direct dependency, these suites show TS compilation errors in the test runner but still pass because the runtime JS works fine.
- The `sql.raw` warning in test output is expected from connection-filter-operators.ts test mocking.

## Building

```bash
cd graphile/graphile-postgis
pnpm build  # Uses makage — outputs CJS + ESM to dist/
```

Or from the monorepo root:
```bash
cd ~/repos/constructive && pnpm build
```

## Key Patterns

### Adding a New Object Field Plugin

1. Create `src/plugins/my-fields.ts`
2. Use `schema.hooks.GraphQLObjectType_fields` hook
3. Check `context.scope.isPgGISType` and `context.scope.pgGISTypeDetails.subtype` to filter applicable types
4. Use `build.extend(fields, newFields, 'reason')` to add fields
5. Add to `src/preset.ts` plugins array and export from `src/index.ts`
6. Update `__tests__/index.test.ts` expected exports list and `__tests__/preset.test.ts` plugin count

### Adding a New Filter Operator

1. Create a factory function in `src/plugins/my-operator.ts`
2. For simple operators (2 args): follow `connection-filter-operators.ts` pattern
3. For compound operators (3+ args): follow `within-distance-operator.ts` pattern with custom `resolveType` hook
4. Add factory to `connectionFilterOperatorFactories` array in `src/preset.ts`
5. Export from `src/index.ts`

### GisFieldValue Type

All geometry object field resolvers receive `GisFieldValue` as the source:
```typescript
interface GisFieldValue {
  __gisType: string;   // e.g., 'Point', 'Polygon'
  __srid: number;      // e.g., 4326
  __geojson: Geometry;  // GeoJSON geometry object
}
```

## Constants

- `CONCRETE_SUBTYPES` — Array of 7 PostGIS subtypes (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection)
- `GisSubtype` — Enum mapping subtype names to numeric codes (0-7)
- 26 total spatial filter operators (13 function-based ST_* + 13 bbox operators)
- 58 type registrations per operator (29 geometry + 29 geography type names)
