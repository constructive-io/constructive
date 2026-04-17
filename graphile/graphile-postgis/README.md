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

## The problem

Working with PostGIS from an app is usually painful for one specific
reason: **you end up juggling large amounts of GeoJSON across tables on
the client**. You fetch every clinic as GeoJSON, fetch every county
polygon as GeoJSON, and then — in the browser — loop through them
yourself to figure out which clinic sits inside which county. Every
query, every count, every page of results becomes a client-side
geometry problem.

An ORM generated automatically from your database schema can't fix this
on its own. It sees a `geometry` column and stops there — it has no
idea that "clinics inside a county" is the question you actually want
to ask. Foreign keys tell it how tables relate by equality; nothing
tells it how tables relate *spatially*.

So we added the missing primitive: a **spatial relation**. You declare,
on the database column, that `clinics.location` is "inside"
`counties.geom`, and the generated GraphQL schema + ORM gain a
first-class `where: { county: { some: { … } } }` shape that runs the
join server-side, in one SQL query, using PostGIS and a GIST index. No
GeoJSON on the wire, no client-side geometry, and the relation composes
with the rest of your `where:` the same way a foreign-key relation
would.

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
- Cross-table spatial relations via `@spatialRelation` smart tags (see below)
- Graceful degradation when PostGIS is not installed

## Spatial relations via smart tags

You declare a **spatial relation** with a `@spatialRelation` smart tag
on a `geometry` or `geography` column. The plugin turns that tag into a
virtual relation on the owning table: a new field on the table's
generated `where` input that runs a PostGIS join server-side. You write
one line of SQL once; the generated ORM and GraphQL schema pick it up
automatically.

### At a glance

**Before** — GeoJSON juggling on the client:

```ts
// 1. Pull every clinic's location as GeoJSON.
const clinics = await gql(`{ telemedicineClinics { nodes { id name location } } }`);
// 2. Pull the polygon of the one county you care about.
const { geom } = await gql(`{ countyByName(name: "Bay County") { geom } }`);
// 3. Run point-in-polygon on the client for each clinic.
const inBay = clinics.telemedicineClinics.nodes.filter((c) =>
  booleanPointInPolygon(c.location, geom),
);
```

**After** — server-side, one trip:

```sql
COMMENT ON COLUMN telemedicine_clinics.location IS
  E'@spatialRelation county counties.geom st_within';
```

```ts
const inBay = await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: { county: { some: { name: { equalTo: 'Bay County' } } } },
  })
  .execute();
```

No polygon crosses the wire. The join happens in a single
`EXISTS (…)` subquery on the server, using a PostGIS predicate on the
two columns.

### Declaring a relation

#### Tag grammar

```
@spatialRelation <relationName> <targetRef> <operator> [<paramName>]
```

- `<relationName>` — user-chosen name for the new field on the owning
  table's `where` input. Must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. The
  name is preserved as-written — `county` stays `county`,
  `nearbyClinic` stays `nearbyClinic`.
- `<targetRef>` — `table.column` (defaults to the owning column's
  schema) or `schema.table.column` (for references in another schema,
  e.g. a shared `geo` schema).
- `<operator>` — one of the eight PG-native snake_case tokens listed in
  [Operator reference](#operator-reference).
- `<paramName>` — required if and only if the operator is parametric.
  Today that's `st_dwithin`, which needs a parameter name (typically
  `distance`).

Both sides of the relation must be `geometry` or `geography`, and they
must share the **same** base codec — you cannot mix `geometry` and
`geography`.

#### Multiple relations on one column

Stack tags. Each line becomes its own field on the owning table's
`where` input:

```sql
COMMENT ON COLUMN telemedicine_clinics.location IS
  E'@spatialRelation county              counties.geom                  st_within\n'
  '@spatialRelation intersectingCounty  counties.geom                  st_intersects\n'
  '@spatialRelation coveringCounty      counties.geom                  st_coveredby\n'
  '@spatialRelation nearbyClinic        telemedicine_clinics.location  st_dwithin distance';
```

The four relations above all exist in the integration test suite and
can be used in the same query. Two relations on the same owner cannot
share a `<relationName>`.

### Operator reference

| Tag operator | PostGIS function | Parametric? | Symmetric? | Typical use |
|---|---|---|---|---|
| `st_contains`        | `ST_Contains(A, B)`  | no          | **no** (A contains B) | polygon containing a point / line / polygon |
| `st_within`          | `ST_Within(A, B)`    | no          | **no** (A within B)   | point-in-polygon, line-in-polygon |
| `st_covers`          | `ST_Covers(A, B)`    | no          | **no**                | like `st_contains` but boundary-inclusive |
| `st_coveredby`       | `ST_CoveredBy(A, B)` | no          | **no**                | dual of `st_covers` |
| `st_intersects`      | `ST_Intersects(A, B)`| no          | yes                   | any overlap at all |
| `st_equals`          | `ST_Equals(A, B)`    | no          | yes                   | exact geometry match |
| `st_bbox_intersects` | `A && B` (infix)     | no          | yes                   | fast bounding-box prefilter |
| `st_dwithin`         | `ST_DWithin(A, B, d)`| **yes** (`d`) | yes                 | radius / proximity search |

> The tag reads left-to-right as **"owner op target"**, and the emitted
> SQL is exactly `ST_<op>(owner_col, target_col[, distance])`. For
> symmetric operators (`st_intersects`, `st_equals`, `st_dwithin`,
> `st_bbox_intersects`) argument order doesn't matter. For directional
> operators (`st_within`, `st_contains`, `st_covers`, `st_coveredby`),
> flipping the two columns inverts the result set. Rule of thumb: put
> the relation on the column whose type makes the sentence true —
> `clinics.location st_within counties.geom` reads naturally; the
> reverse does not.

### Using the generated `where` shape

#### Through the ORM

```ts
// "Clinics inside any county named 'Bay County'"
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: { county: { some: { name: { equalTo: 'Bay County' } } } },
  })
  .execute();
```

#### Through GraphQL

PostGraphile exposes the same shape on its connection argument. The
ORM calls it `where:`; raw PostGraphile calls it `filter:` — that's the
generated schema's name, not ours. Both accept the same tree:

```graphql
{
  telemedicineClinics(
    filter: { county: { some: { name: { equalTo: "Bay County" } } } }
  ) {
    nodes { id name }
  }
}
```

#### `some` / `every` / `none`

Every 2-argument relation exposes three modes. They mean what you'd
expect, backed by `EXISTS` / `NOT EXISTS`:

- `some: { <where clause> }` — the row matches if at least one related
  target row passes the where clause.
- `none: { <where clause> }` — the row matches if no related target row
  passes.
- `every: { <where clause> }` — the row matches when every related
  target row passes (i.e. "no counter-example exists"). Note that
  `every: {}` on an empty target set is vacuously true.

An empty inner clause (`some: {}`) means "at least one related target
row exists, any row will do" — so for `@spatialRelation county …
st_within`, clinics whose point is inside zero counties are correctly
excluded.

#### Parametric operators (`st_dwithin` + `distance`)

Parametric relations add a **required** `distance: Float!` field next
to `some` / `every` / `none`. The distance parametrises the join
itself, not the inner `some:` clause:

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

Distance units follow PostGIS semantics:

| Owner codec | `distance` units |
|---|---|
| `geography` | meters |
| `geometry`  | SRID coordinate units (degrees for SRID 4326) |

#### Composition with `and` / `or` / `not` and scalar where clauses

Spatial relations live in the same `where:` tree as every scalar
predicate and compose the same way:

```ts
// AND — Bay County clinics that are cardiology
where: {
  and: [
    { county: { some: { name: { equalTo: 'Bay County' } } } },
    { specialty: { equalTo: 'cardiology' } },
  ],
}

// OR — Bay County clinics OR the one named "LA Pediatrics"
where: {
  or: [
    { county: { some: { name: { equalTo: 'Bay County' } } } },
    { name: { equalTo: 'LA Pediatrics' } },
  ],
}

// NOT — clinics that are NOT in Bay County
where: {
  not: { county: { some: { name: { equalTo: 'Bay County' } } } },
}
```

Inside `some` / `every` / `none`, the inner where clause is the target
table's full `where` input — every scalar predicate the target exposes
is available.

### Self-relations

When the owner and target columns are the same column, the plugin
emits a self-exclusion predicate so a row never matches itself:

- Single-column primary key: `other.<pk> <> self.<pk>`
- Composite primary key: `(other.a, other.b) IS DISTINCT FROM (self.a, self.b)`

Tables without a primary key are rejected at schema build — a
self-relation there would match every row against itself.

One concrete consequence: with `st_dwithin`, a self-relation at
`distance: 0` matches zero rows, because the only candidate at
distance 0 is the row itself, which is excluded.

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

The EXISTS lives inside the owner's generated `where` input, so it
composes with pagination, ordering, and the rest of the outer plan.
`st_bbox_intersects` compiles to infix `&&` rather than a function call.
PostGIS functions are called with whichever schema PostGIS is installed
in, so non-`public` installs work without configuration.

### Indexing

Spatial predicates without a GIST index fall back to sequential scans,
which is almost never what you want. The plugin checks your target
columns at schema-build time and emits a non-fatal warning when a GIST
index is missing, including the recommended `CREATE INDEX ... USING
GIST(...)` in the warning text.

```sql
CREATE INDEX ON telemedicine_clinics USING GIST(location);
CREATE INDEX ON counties              USING GIST(geom);
```

If a particular column is a known exception (e.g. a small prototype
table), set `@spatialRelationSkipIndexCheck` on that column to suppress
the warning.

### `geometry` vs `geography`

Pick one side of a relation and stick with it — mixing codecs across
the two sides is rejected at schema build. `geography` distances are
always meters; `geometry` distances follow the SRID's native units
(degrees for SRID 4326, which is rarely what you want for radius
searches). If you need meter-based proximity on a `geometry` column,
cast on ingest (`::geography`) rather than mixing codecs across a
single relation.

### FAQ

- **"Why doesn't `some: {}` return every row?"** — because `some` means
  "at least one related target row exists". Rows whose column has no
  match on the other side are correctly excluded.
- **"Why does `distance: 0` on a self-relation return nothing?"** — the
  self-exclusion predicate removes the row's match with itself, so at
  distance 0 no candidates remain.
- **"Can I reuse a `relationName` across tables?"** — yes; uniqueness
  is scoped to the owning table.
- **"Can I declare the relation from the polygon side instead of the
  point side?"** — yes. Flip owner and target and use the inverse
  operator (`st_contains` in place of `st_within`). Same rows, same
  SQL, different `where` location.
- **"Does this work with PostGIS installed in a non-`public` schema?"**
  — yes.
- **"Can I use a spatial relation in `orderBy` or on a connection
  field?"** — no; it's a where-only construct. Use PostGIS measurement
  fields (see the `geometry-fields` / `measurement-fields` plugins) for
  values you want to sort on.

## License

MIT
