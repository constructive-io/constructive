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

A full PostGIS integration for PostGraphile v5. Turns every
`geometry` / `geography` column into a typed, introspectable GraphQL
field — with GeoJSON scalars, subtype-specific fields, measurement
helpers, spatial filters, aggregates, and cross-table **spatial
relations** — and wires the whole thing into the generated ORM so you
can query spatial data the same way you query anything else.

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [Features at a glance](#features-at-a-glance)
- [GeoJSON scalar and typed geometry columns](#geojson-scalar-and-typed-geometry-columns)
- [Dimension-aware interfaces and subtype fields](#dimension-aware-interfaces-and-subtype-fields)
- [Measurement fields (`length`, `area`, `perimeter`)](#measurement-fields-length-area-perimeter)
- [Transformation fields (`centroid`, `bbox`, `numPoints`)](#transformation-fields-centroid-bbox-numpoints)
- [Per-column spatial filters](#per-column-spatial-filters)
- [PostGIS aggregate fields](#postgis-aggregate-fields)
- [Spatial relations (`@spatialRelation`)](#spatial-relations-spatialrelation)
- [Graceful degradation](#graceful-degradation)
- [License](#license)

## Installation

```bash
npm install graphile-postgis
```

## Usage

```ts
import { GraphilePostgisPreset } from 'graphile-postgis';

const preset = {
  extends: [GraphilePostgisPreset],
};
```

The preset bundles every plugin listed below. You can also import each
plugin individually (`PostgisCodecPlugin`, `PostgisRegisterTypesPlugin`,
`PostgisGeometryFieldsPlugin`, `PostgisMeasurementFieldsPlugin`,
`PostgisTransformationFieldsPlugin`, `PostgisAggregatePlugin`,
`PostgisSpatialRelationsPlugin`, …) if you prefer à-la-carte.

## Features at a glance

- **GeoJSON scalar** for input and output on every `geometry` /
  `geography` column.
- **Full type hierarchy** — `Geometry` / `Geography` interfaces,
  dimension-aware interfaces (`XY`, `XYZ`, `XYM`, `XYZM`), and
  concrete subtype objects (`Point`, `LineString`, `Polygon`,
  `MultiPoint`, `MultiLineString`, `MultiPolygon`,
  `GeometryCollection`).
- **Subtype-specific accessors** — `x` / `y` / `z` on points
  (`longitude` / `latitude` / `height` on `geography`), `points` on
  line strings, `exterior` / `interiors` on polygons, etc.
- **Measurement fields** — `length`, `area`, `perimeter`, computed
  geodesically from GeoJSON on the server.
- **Transformation fields** — `centroid`, `bbox`, `numPoints`.
- **Per-column spatial filters** — every PostGIS topological
  predicate (`intersects`, `contains`, `within`, `dwithin`, …) and
  every bounding-box operator (`bboxIntersects2D`, `bboxContains`,
  `bboxLeftOf`, …) wired into the generated `where:` shape.
- **Aggregate fields** — `stExtent`, `stUnion`, `stCollect`,
  `stConvexHull` exposed on every aggregate type for a geometry
  column.
- **Spatial relations** — a `@spatialRelation` smart tag that
  declares cross-table spatial joins as first-class relations (ORM +
  GraphQL), backed by PostGIS predicates and GIST indexes.
- **Auto-detects PostGIS** in any schema (not just `public`) and
  **degrades gracefully** when the extension isn't installed.

## GeoJSON scalar and typed geometry columns

A `geometry` / `geography` column is exposed as a typed GraphQL object
with a `geojson` field carrying the GeoJSON payload. You select it the
same way you select any nested object:

```ts
// Read a location column as GeoJSON through the ORM
const result = await orm.location
  .findMany({
    select: { name: true, geom: { select: { geojson: true } } },
    where: { name: { equalTo: 'Central Park Cafe' } },
  })
  .execute();
```

Input values (mutations, filters) accept GeoJSON directly — any of
`Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`,
`MultiPolygon`, or `GeometryCollection`.

## Dimension-aware interfaces and subtype fields

Each concrete subtype is its own GraphQL object with fields that make
sense for that subtype:

| Subtype             | Notable fields                                      |
|---------------------|------------------------------------------------------|
| `Point`             | `x` / `y` / `z` (or `longitude` / `latitude` / `height` on `geography`) |
| `LineString`        | `points: [Point!]`                                  |
| `Polygon`           | `exterior: LineString`, `interiors: [LineString!]`  |
| `MultiPoint`        | `points: [Point!]`                                  |
| `MultiLineString`   | `lineStrings: [LineString!]`                        |
| `MultiPolygon`      | `polygons: [Polygon!]`                              |
| `GeometryCollection`| `geometries: [Geometry!]`                           |

On top of those, every geometry type also exposes the `XY` / `XYZ` /
`XYM` / `XYZM` dimension interfaces so a client can ask for
coordinates without branching on the specific subtype.

```graphql
# Example GraphQL selection on a Polygon column
{
  counties {
    nodes {
      name
      geom {
        geojson
        exterior {
          points { x y }
        }
      }
    }
  }
}
```

## Measurement fields (`length`, `area`, `perimeter`)

Subtype-appropriate measurement fields are added automatically, using
geodesic math on the GeoJSON payload (Haversine for distance,
spherical excess for area, WGS84 / SRID 4326 assumed):

| Subtype                                         | Fields added            |
|-------------------------------------------------|-------------------------|
| `LineString`, `MultiLineString`                 | `length`                |
| `Polygon`, `MultiPolygon`                       | `area`, `perimeter`     |

Values are `Float` in meters (length / perimeter) and square meters
(area).

```graphql
{
  counties {
    nodes {
      name
      geom { area perimeter }
    }
  }
  routes {
    nodes {
      id
      path { length }
    }
  }
}
```

For exact server-side PostGIS measurements (e.g. `ST_Area` with a
specific SRID projection), define a computed column in SQL — these
fields are client-facing conveniences, not a replacement for
projection-aware analytics.

## Transformation fields (`centroid`, `bbox`, `numPoints`)

Every geometry object also gets three lightweight transformation
fields:

- `centroid: [Float!]` — coordinate-mean centroid.
- `bbox: [Float!]` — `[minX, minY, maxX, maxY]` bounding box.
- `numPoints: Int!` — total coordinate count.

```graphql
{
  parks {
    nodes {
      name
      geom { centroid bbox numPoints }
    }
  }
}
```

For `ST_Transform` / `ST_Buffer` / `ST_Simplify` / `ST_MakeValid`,
which all take parameters, declare a custom SQL function or computed
column — the object-level transformation fields intentionally stick
to parameter-free helpers.

## Per-column spatial filters

Every PostGIS predicate is registered as a filter operator on the
column's `where:` entry, both for `geometry` and `geography` codecs:

- Topological: `intersects`, `contains`, `containsProperly`, `within`,
  `covers`, `coveredBy`, `touches`, `crosses`, `disjoint`, `overlaps`,
  `equals`, `orderingEquals`.
- Distance: `dwithin` (parametric).
- 2D / ND bounding-box: `bboxIntersects2D`, `bboxIntersectsND`,
  `bboxContains`, `bboxEquals`.
- Directional bounding-box: `bboxLeftOf`, `bboxRightOf`, `bboxAbove`,
  `bboxBelow`, `bboxOverlapsOrLeftOf`, `bboxOverlapsOrRightOf`,
  `bboxOverlapsOrAbove`, `bboxOverlapsOrBelow`.

All of them take GeoJSON as input — the plugin wraps the value with
`ST_GeomFromGeoJSON(...)::<codec>` before it hits PostgreSQL, so
`Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`,
`MultiPolygon`, and `GeometryCollection` inputs all work uniformly.

```ts
// Cities whose location is inside a polygon
const inBayArea = await orm.citiesGeom
  .findMany({
    select: { id: true, name: true },
    where: { loc: { intersects: BAY_AREA_POLYGON } },
  })
  .execute();

// Cities whose bbox sits strictly west of a reference point
const westOfCentral = await orm.citiesGeom
  .findMany({
    select: { id: true, name: true },
    where: { loc: { bboxLeftOf: { type: 'Point', coordinates: [-100.0, 37.77] } } },
  })
  .execute();
```

## PostGIS aggregate fields

On every aggregate type for a geometry / geography column, the plugin
adds four SQL-level aggregate fields that run in-database:

- `stExtent` — `ST_Extent(...)` — bounding box of all rows as a
  GeoJSON Polygon.
- `stUnion` — `ST_Union(...)` — union of all rows as GeoJSON.
- `stCollect` — `ST_Collect(...)` — collect into a
  `GeometryCollection`.
- `stConvexHull` — `ST_ConvexHull(ST_Collect(...))` — convex hull of
  all rows as a GeoJSON Polygon.

```graphql
{
  citiesGeoms {
    aggregates {
      stExtent { loc { geojson } }
      stConvexHull { loc { geojson } }
    }
  }
}
```

## Spatial relations (`@spatialRelation`)

Spatial relations are the plugin's cross-table feature: a way to
declare, directly on a database column, that two tables are related
*spatially* — "clinics inside a county", "parcels touching a road",
"events within 5 km of a user" — and get a first-class relation in
the generated ORM and GraphQL schema for free.

### Why a dedicated primitive

Without this, spatial joins from an app usually devolve into shipping
GeoJSON across the wire: every clinic as GeoJSON, every county
polygon as GeoJSON, a point-in-polygon loop on the client. An
auto-generated ORM can't do better on its own — it sees a `geometry`
column and stops there. Foreign keys describe equality; nothing
describes *containment* or *proximity*.

A `@spatialRelation` tag declares that `clinics.location` is
"within" `counties.geom`, and the generated schema + ORM gain a
first-class `where: { county: { some: { … } } }` shape that runs the
join server-side, in one SQL query, using PostGIS and a GIST index.
No GeoJSON on the wire; the relation composes with the rest of your
`where:` the same way a foreign-key relation would.

### Declaring a relation

Put the tag on the owning geometry / geography column:

```sql
COMMENT ON COLUMN telemedicine_clinics.location IS
  E'@spatialRelation county counties.geom st_within';
```

Tag grammar:

```
@spatialRelation <relationName> <targetRef> <operator> [<paramName>]
```

- `<relationName>` — user-chosen name for the new field on the
  owner's `where` input. Must match `/^[A-Za-z_][A-Za-z0-9_]*$/`.
- `<targetRef>` — `table.column` (defaults to the owning column's
  schema) or `schema.table.column`.
- `<operator>` — one of the eight PG-native snake_case tokens listed
  below.
- `<paramName>` — required if the operator is parametric. Today that
  is only `st_dwithin` (use `distance`).

Both sides must be `geometry` or `geography`, and share the **same**
codec — mixing is rejected at schema build.

Stack multiple relations on one column by separating tags with `\n`:

```sql
COMMENT ON COLUMN telemedicine_clinics.location IS
  E'@spatialRelation county              counties.geom                  st_within\n'
  '@spatialRelation intersectingCounty  counties.geom                  st_intersects\n'
  '@spatialRelation coveringCounty      counties.geom                  st_coveredby\n'
  '@spatialRelation nearbyClinic        telemedicine_clinics.location  st_dwithin distance';
```

### Operator reference

| Tag operator         | PostGIS function      | Parametric?    | Symmetric?            | Typical use                                      |
|----------------------|-----------------------|----------------|-----------------------|--------------------------------------------------|
| `st_contains`        | `ST_Contains(A, B)`   | no             | **no** (A contains B) | polygon containing a point / line / polygon     |
| `st_within`          | `ST_Within(A, B)`     | no             | **no** (A within B)   | point-in-polygon, line-in-polygon               |
| `st_covers`          | `ST_Covers(A, B)`     | no             | **no**                | like `st_contains`, boundary-inclusive          |
| `st_coveredby`       | `ST_CoveredBy(A, B)`  | no             | **no**                | dual of `st_covers`                             |
| `st_intersects`      | `ST_Intersects(A, B)` | no             | yes                   | any overlap at all                              |
| `st_equals`          | `ST_Equals(A, B)`     | no             | yes                   | exact geometry match                            |
| `st_bbox_intersects` | `A && B` (infix)      | no             | yes                   | fast bounding-box prefilter                     |
| `st_dwithin`         | `ST_DWithin(A, B, d)` | **yes** (`d`)  | yes                   | radius / proximity search                       |

The tag reads left-to-right as **"owner op target"**, and the emitted
SQL is exactly `ST_<op>(owner_col, target_col[, distance])`. For
directional operators (`st_within`, `st_contains`, `st_covers`,
`st_coveredby`), flipping the two columns inverts the result set; put
the relation on the column whose type makes the sentence true.

### Using a spatial relation from the ORM

Every 2-argument relation exposes `some` / `every` / `none` against
the target table's full `where` input:

```ts
// "Clinics inside LA County" — st_within, one SQL query, no GeoJSON on the wire.
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: { county: { some: { name: { equalTo: 'LA County' } } } },
  })
  .execute();

// "Clinics NOT in NYC County" — negation via `none`.
await orm.telemedicineClinic
  .findMany({
    select: { id: true },
    where: { county: { none: { name: { equalTo: 'NYC County' } } } },
  })
  .execute();

// "Any clinic that sits inside at least one county" — empty inner
// clause still excludes points that fall outside every county.
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: { county: { some: {} } },
  })
  .execute();
```

Parametric relations (today: `st_dwithin`) add a required `distance`
field alongside `some` / `every` / `none`:

```ts
// "Clinics within 10 SRID units of any cardiology clinic" — self-relation
// with parametric distance; a row never matches itself.
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: {
      nearbyClinic: {
        distance: 10.0,
        some: { specialty: { equalTo: 'cardiology' } },
      },
    },
  })
  .execute();
```

### Using a spatial relation from GraphQL

The same tree, same field names — just under `where:` on the
connection argument:

```graphql
{
  telemedicineClinics(
    where: { county: { some: { name: { equalTo: "Bay County" } } } }
  ) {
    nodes { id name }
  }
}
```

### Composition

Spatial relations live in the same `where:` tree as every scalar
predicate and compose identically:

```ts
// Bay County clinics that are cardiology
where: {
  and: [
    { county: { some: { name: { equalTo: 'Bay County' } } } },
    { specialty: { equalTo: 'cardiology' } },
  ],
}

// Bay County clinics OR the one named "LA Pediatrics"
where: {
  or: [
    { county: { some: { name: { equalTo: 'Bay County' } } } },
    { name: { equalTo: 'LA Pediatrics' } },
  ],
}

// Clinics NOT in Bay County
where: {
  not: { county: { some: { name: { equalTo: 'Bay County' } } } },
}
```

### Self-relations and self-exclusion

When the owner and target columns are the same column, the plugin
emits a self-exclusion predicate so a row never matches itself:

- Single-column primary key: `other.<pk> <> self.<pk>`.
- Composite primary key: `(other.a, other.b) IS DISTINCT FROM (self.a, self.b)`.
- Tables without a primary key are rejected at schema build.

One consequence: with `st_dwithin`, a self-relation at `distance: 0`
matches zero rows, because the only candidate at distance 0 is the
row itself — and it is excluded.

### Generated SQL shape

```sql
SELECT ...
FROM <owner_table> self
WHERE EXISTS (
  SELECT 1
  FROM <target_table> other
  WHERE ST_<op>(self.<owner_col>, other.<target_col>[, <distance>])
    AND <self-exclusion for self-relations>
    AND <nested some/every/none conditions>
);
```

The `EXISTS` sits inside the owner's generated `where` input, so it
composes cleanly with pagination, ordering, and the rest of the outer
plan. `st_bbox_intersects` compiles to infix `&&` rather than a
function call. PostGIS functions are called with whichever schema
PostGIS is installed in, so non-`public` installs work without extra
configuration.

### Indexing

Spatial predicates without a GIST index fall back to sequential scans,
which is almost never what you want. The plugin checks your target
columns at schema-build time and emits a non-fatal warning when a
GIST index is missing, including the recommended `CREATE INDEX …
USING GIST(...)` in the warning text:

```sql
CREATE INDEX ON telemedicine_clinics USING GIST(location);
CREATE INDEX ON counties              USING GIST(geom);
```

If a particular column is a known exception (e.g. a small prototype
table), set `@spatialRelationSkipIndexCheck` on that column to
suppress the warning.

### `geometry` vs `geography`

Pick one side of a relation and stick with it — mixing codecs across
the two sides is rejected at schema build. `geography` distances are
always meters; `geometry` distances follow the SRID's native units
(degrees for SRID 4326, which is rarely what you want for radius
searches). If you need meter-based proximity on a `geometry` column,
cast on ingest (`::geography`) rather than mixing codecs across a
single relation.

### FAQ

- **"Why doesn't `some: {}` return every row?"** — because `some`
  means "at least one related target row exists". Rows whose column
  has no match on the other side are correctly excluded.
- **"Why does `distance: 0` on a self-relation return nothing?"** —
  the self-exclusion predicate removes the row's match with itself,
  so at distance 0 no candidates remain.
- **"Can I reuse a `relationName` across tables?"** — yes; uniqueness
  is scoped to the owning table.
- **"Can I declare the relation from the polygon side instead of the
  point side?"** — yes. Flip owner and target and use the inverse
  operator (`st_contains` in place of `st_within`). Same rows, same
  SQL, different `where` location.
- **"Does this work with PostGIS installed in a non-`public`
  schema?"** — yes.
- **"Can I use a spatial relation in `orderBy` or on a connection
  field?"** — no; it's a where-only construct. Use the measurement /
  transformation fields for values you want to sort on.

## Graceful degradation

If the `postgis` extension isn't installed in the target database,
the plugin detects that at schema-build time and skips type, filter,
aggregate, and spatial-relation registration instead of breaking the
build. Turning PostGIS on later only requires restarting the server
(or invalidating the schema cache) — no config change.

## License

MIT
