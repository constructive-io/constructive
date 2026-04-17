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
- Cross-table spatial filters via `@spatialRelation` smart tags (see below)
- Graceful degradation when PostGIS is not installed

## Spatial relations via smart tags

`PostgisSpatialRelationsPlugin` lets you declare a cross-table or
self-relation whose join predicate is a PostGIS spatial function. The
plugin emits a first-class relation + filter field on the owning codec's
`Filter` type that compiles to an `EXISTS (…)` subquery using the
declared operator.

### Tag grammar

```sql
COMMENT ON COLUMN <owner_table>.<owner_col> IS
  E'@spatialRelation <relation_name> <target_table>.<target_col> <operator> [<param_name>]';
```

- `<relation_name>` — user-chosen name for the generated field (e.g. `county`)
- `<target_table>.<target_col>` — target geometry/geography column; also
  accepts `<schema>.<table>.<col>`
- `<operator>` — PG-native `st_*` function name; resolved at schema build
  time against `pg_proc`
- `<param_name>` — required only for parametric operators
  (currently `st_dwithin`)

### Supported operators (v1)

| Operator | PostGIS function | Kind  | Arity |
|---|---|---|---|
| `st_contains`        | `ST_Contains`       | function | 2 |
| `st_within`          | `ST_Within`         | function | 2 |
| `st_covers`          | `ST_Covers`         | function | 2 |
| `st_coveredby`       | `ST_CoveredBy`      | function | 2 |
| `st_intersects`      | `ST_Intersects`     | function | 2 |
| `st_equals`          | `ST_Equals`         | function | 2 |
| `st_bbox_intersects` | `&&`                | infix    | 2 |
| `st_dwithin`         | `ST_DWithin`        | function | 3 (parametric) |

### Filter shapes

2-arg operators use the familiar `some` / `every` / `none` shape.

Through the generated ORM (`where:`):

```ts
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: { county: { some: { name: { equalTo: 'California County' } } } },
  })
  .execute();
```

Or equivalently at the GraphQL layer (`filter:`):

```graphql
telemedicineClinics(
  filter: { county: { some: { name: { equalTo: "California County" } } } }
) { nodes { id name } }
```

`st_dwithin` takes its distance at the relation level (it parametrises
the join, not the joined row):

```ts
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: {
      nearbyClinic: {
        distance: 5000,
        some: { specialty: { equalTo: 'pediatrics' } },
      },
    },
  })
  .execute();
```

```graphql
telemedicineClinics(
  filter: {
    nearbyClinic: {
      distance: 5000
      some: { specialty: { equalTo: "pediatrics" } }
    }
  }
) { nodes { id name } }
```

Distance units follow PostGIS semantics: **meters** for `geography`
columns, **SRID coordinate units** for `geometry` columns.

### Self-relations

When `<owner_table>` equals `<target_table>`, the plugin emits an
automatic self-exclusion predicate so a row is never "related to
itself":

- Single-column PK: `other.id <> self.id`
- Composite PK: `(other.a, other.b) IS DISTINCT FROM (self.a, self.b)`

Self-relations on tables without a primary key are rejected at schema
build time.

### GIST index warning

At schema build time the plugin emits a non-fatal warning when the
target geometry/geography column has no GIST index — spatial predicates
are typically unusable without one.

## License

MIT
