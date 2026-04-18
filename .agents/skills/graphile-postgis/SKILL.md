---
name: graphile-postgis
description: How to expose cross-table PostGIS queries to the ORM/GraphQL layer without shipping GeoJSON to the client. Covers the @spatialRelation smart tag (8 operators, parametric distance), the RelationSpatial blueprint node, and the ORM `where:` shape the generated client consumes.
---

# graphile-postgis

Use this skill when a task mentions PostGIS, spatial queries, geometry/geography columns, or "the client is pulling GeoJSON and filtering in JS". The answer is almost always **declare a spatial relation and query it through the ORM `where:` tree** — not adding a custom resolver and not sending polygons over the wire.

## When to reach for this

- "Find clinics inside a county / points inside a polygon / things near a location"
- An agentic-DB session is shipping GeoJSON to the client to compute point-in-polygon or distance on the browser
- A PR adds a new custom GraphQL field that takes a polygon as input and runs `ST_*` inline
- You're about to write a per-pair SQL function like `clinics_in_county(county_id)` to paper over a missing relation

In all of those cases: add a `@spatialRelation` tag on the owning column (or a `RelationSpatial` entry in a blueprint) and use the generated `where:` field.

## The primitive: `@spatialRelation`

Declared on the owning geometry/geography column. Turns into a first-class virtual relation: a new field on the owning table's generated `where` input that runs an `EXISTS (…)` subquery using a PostGIS predicate. One line of SQL, and the ORM/GraphQL schema pick it up automatically.

### Tag grammar

```
@spatialRelation <relationName> <targetRef> <operator> [<paramName>]
```

- `<relationName>` — name of the emitted `where:` field on the owner. Preserved as-written. Must match `/^[A-Za-z_][A-Za-z0-9_]*$/`.
- `<targetRef>` — `table.column` or `schema.table.column`.
- `<operator>` — one of the eight PG-native snake_case tokens below.
- `<paramName>` — required iff the operator is parametric (only `st_dwithin` today; use `distance`).

Both sides must be `geometry` or `geography`, and the same codec. Mixing is rejected at schema build.

### Operator reference (v1)

| Tag | PostGIS | Parametric? | Symmetric? |
|---|---|---|---|
| `st_contains`        | `ST_Contains(A, B)`   | no  | no (A ⊇ B) |
| `st_within`          | `ST_Within(A, B)`     | no  | no (A ⊆ B) |
| `st_covers`          | `ST_Covers(A, B)`     | no  | no         |
| `st_coveredby`       | `ST_CoveredBy(A, B)`  | no  | no         |
| `st_intersects`      | `ST_Intersects(A, B)` | no  | yes        |
| `st_equals`          | `ST_Equals(A, B)`     | no  | yes        |
| `st_bbox_intersects` | `A && B` (infix)      | no  | yes        |
| `st_dwithin`         | `ST_DWithin(A, B, d)` | **yes (`d`)** | yes |

Tag reads left-to-right as **"owner op target"**. Emitted SQL is exactly `ST_<op>(owner, target[, distance])`. For directional operators, flipping owner/target inverts the result set — put the tag on the column whose type makes the sentence true (`clinics.location st_within counties.geom`).

## Two ways to declare one

### 1. Raw SQL comment (lowest level)

```sql
COMMENT ON COLUMN telemedicine_clinics.location IS
  E'@spatialRelation county counties.geom st_within';
```

Fine for prototyping or hand-written migrations. Stacks — separate tags with `\n`:

```sql
COMMENT ON COLUMN telemedicine_clinics.location IS
  E'@spatialRelation county              counties.geom                  st_within\n'
  '@spatialRelation intersectingCounty   counties.geom                  st_intersects\n'
  '@spatialRelation nearbyClinic         telemedicine_clinics.location  st_dwithin distance';
```

### 2. Blueprint `RelationSpatial` node (preferred in constructive-db)

This is the declarative path that `construct_blueprint` dispatches on. The metaschema trigger emits the smart tag for you — don't write the `COMMENT ON COLUMN` by hand if the column is managed by a blueprint.

```json
{
  "$type": "RelationSpatial",
  "source_table": "clinics",
  "source_field": "location",
  "target_table": "counties",
  "target_field": "geom",
  "name": "containing_county",
  "operator": "st_within"
}
```

With a parametric operator, add `param_name`:

```json
{
  "$type": "RelationSpatial",
  "source_table": "telemedicine_clinics",
  "source_field": "location",
  "target_table": "telemedicine_clinics",
  "target_field": "location",
  "name": "nearby_clinic",
  "operator": "st_dwithin",
  "param_name": "distance"
}
```

- Both fields must already exist — `RelationSpatial` is metadata-only, it doesn't create columns or junction tables.
- **One direction per tag.** If you want the inverse, write a second `RelationSpatial` on the other side (e.g. `counties.contained_clinic` with `st_contains`). The system does not auto-generate symmetric entries.
- **Idempotent.** Re-running the blueprint with the same `(source_table, name)` is a no-op — `provision_spatial_relation` returns the existing id without modifying the row.
- Registered node type: [`graphql/node-type-registry/src/relation/relation-spatial.ts`](../../../graphql/node-type-registry/src/relation/relation-spatial.ts).
- Dispatcher: `metaschema_modules_public.construct_blueprint` in `constructive-db` routes `$type=RelationSpatial` to `provision_spatial_relation`.

## Querying through the ORM (`where:`)

The generated field lives in the owning table's `where` input. You always write `where:` — that's the shape the ORM exposes.

```ts
// "Clinics inside any county named 'Bay County'" — one round trip, no GeoJSON on the wire
await orm.telemedicineClinic
  .findMany({
    select: { id: true, name: true },
    where: { county: { some: { name: { equalTo: 'Bay County' } } } },
  })
  .execute();
```

### `some` / `every` / `none`

Every 2-arg relation exposes all three:

- `some: { … }` — at least one related target row passes the inner where.
- `none: { … }` — no related target row passes.
- `every: { … }` — every related target row passes (vacuously true on empty target set).
- `some: {}` means "at least one related target row exists, any row" — rows whose column has zero matches on the other side are excluded.

### Parametric (`st_dwithin`)

Adds a **required** `distance: Float!` next to `some`/`every`/`none`. It parametrises the join, not the inner clause:

```ts
await orm.telemedicineClinic
  .findMany({
    where: {
      nearbyClinic: {
        distance: 5000,
        some: { specialty: { equalTo: 'pediatrics' } },
      },
    },
  })
  .execute();
```

Distance units: **meters** for `geography`, **SRID coordinate units** for `geometry` (degrees for SRID 4326 — cast to `::geography` on ingest if you want meter-based radius).

### Composition

Spatial relations live in the same `where:` tree as scalars and compose with `and`/`or`/`not` the same way a foreign-key relation would. See the plugin README for AND/OR/NOT examples.

## Self-relations

Owner and target column can be the same. The plugin emits a self-exclusion predicate so a row never matches itself:

- Single-column PK: `other.<pk> <> self.<pk>`
- Composite PK: `(other.a, other.b) IS DISTINCT FROM (self.a, self.b)`

Tables without a primary key are rejected at schema-build. One consequence: `st_dwithin` with `distance: 0` on a self-relation returns zero rows.

## GIST indexes

Without a GIST index on the target column, spatial predicates fall back to seq scans. The plugin emits a non-fatal build warning when one is missing; act on it.

```sql
CREATE INDEX ON telemedicine_clinics USING GIST(location);
CREATE INDEX ON counties              USING GIST(geom);
```

Opt a column out with `@spatialRelationSkipIndexCheck` on that column.

## Debugging checklist

| Symptom | Likely cause |
|---|---|
| `where: { myRelation: { some: {} } }` excludes rows you expected to see | `some: {}` means "at least one related target row exists". Rows whose owner column has zero matches on the target side are correctly excluded. If you want unfiltered, drop the relation from the where clause. |
| Radius search returns wrong rows on a `geometry` column | `distance` is SRID units, not meters, for `geometry`. Cast to `::geography` on ingest for meter-based radius, or pick the SRID whose units you want. |
| Schema-build warning about missing GIST index | Target column has no GIST index. Add one, or set `@spatialRelationSkipIndexCheck` if you know what you're doing (small table, prototype). |
| Schema-build error "cannot mix geometry and geography" | Owner and target columns have different codecs. Pick one — cast on ingest. |
| Schema-build error on a self-relation | Owner table has no primary key. Self-relations need a PK so a row can be excluded from matching itself. Add one. |

## Scope guardrails

- **Don't** add a custom GraphQL resolver that takes a polygon as input to compute the relation — use a spatial relation.
- **Don't** write per-pair helper functions (`clinics_in_county(uuid)`). The plugin is the general case.
- **Don't** auto-generate inverse relations. One direction per tag — write a second entry if you need both sides.
- **Don't** mix `geometry` and `geography` across a single relation. Cast on ingest.
- **Don't** use a spatial relation in `orderBy`. It's where-only. For measurement fields you want to sort on, use the `geometry-fields` / `measurement-fields` plugins.

## Pointers

- Plugin source: [`graphile/graphile-postgis/src/plugins/PostgisSpatialRelationsPlugin.ts`](../../../graphile/graphile-postgis/src/plugins/PostgisSpatialRelationsPlugin.ts)
- Plugin README (full reference + FAQ): [`graphile/graphile-postgis/README.md`](../../../graphile/graphile-postgis/README.md)
- Blueprint node type: [`graphql/node-type-registry/src/relation/relation-spatial.ts`](../../../graphql/node-type-registry/src/relation/relation-spatial.ts)
- Metaschema table, trigger, provisioner: `constructive-io/constructive-db`, `metaschema_public.spatial_relation` (PR #840) + `metaschema_modules_public.provision_spatial_relation` + `construct_blueprint` dispatcher (PR #844)
- E2E test suite (66 live-PG cases): `graphql/orm-test/__tests__/postgis-spatial.test.ts`
- Unit test suite (218 structural cases): `graphile/graphile-postgis/__tests__/`
