---
name: graphile-meta
description: The _meta schema-introspection plugin for PostGraphile v5 (MetaSchemaPlugin / MetaSchemaPreset in graphile-settings). Exposes a single _meta root query describing every table's fields, indexes, constraints, relations, inflection names, root query/mutation names, and smart-tag-derived metadata (storage, search, i18n, realtime). Use when asked to "expose database metadata in GraphQL", "add a field to _meta", "understand the _meta query", "drive codegen from _meta", or when adding a new smart-tag-detected metadata builder to the meta-schema plugin.
compatibility: PostGraphile v5, graphile-settings, graphile-build-pg
metadata:
  author: constructive-io
  version: "1.0.0"
---

# Graphile Meta — the `_meta` Introspection Plugin

A single PostGraphile v5 plugin that adds a `_meta` root query exposing the
database's structural metadata (tables, fields, indexes, constraints, relations)
plus Constructive-specific feature metadata derived from smart tags (storage,
search, i18n, realtime). Built for code-generation tools that need to understand
the schema without a live database connection at generation time.

**Package:** `graphile-settings` — plugin lives in
`graphile/graphile-settings/src/plugins/meta-schema/`
(exposed as `MetaSchemaPlugin` / `MetaSchemaPreset`).

> Not to be confused with the **meta API target** in constructive-db
> (`cli-meta` / `orm-meta` skills) — that is a codegen *target* over ~45
> metaschema tables. This skill is about the graphile `_meta` **introspection
> query**.

## When to Apply

Use this skill when:
- Enabling or querying the `_meta` introspection query
- Understanding what schema metadata is available to codegen / clients
- Adding a new piece of table metadata to `_meta` (new smart-tag builder + type)
- Driving code generation, docs, or scaffolding from `_meta`
- Debugging why a table's `storage` / `search` / `i18n` / `realtime` (or a new
  `scope`) block is `null`

## Quick Start

```typescript
import { MetaSchemaPreset } from 'graphile-settings';
// (already included in ConstructivePreset)

const preset: GraphileConfig.Preset = {
  extends: [MetaSchemaPreset],
};
```

```graphql
query {
  _meta {
    tables {
      name
      schemaName
      fields { name type { pgType gqlType isArray } isNotNull hasDefault isPrimaryKey isForeignKey }
      indexes { name isUnique isPrimary columns }
      constraints { primaryKey { name } unique { name } foreignKey { name referencedTable } }
      relations { belongsTo { fieldName references { name } } hasMany { fieldName referencedBy { name } } manyToMany { fieldName rightTable { name } } }
      inflection { tableType allRows connection edge createInputType }
      query { all one create update delete }
      storage { isFilesTable isBucketsTable }
      search { algorithms columns { name algorithm } hasUnifiedSearch config { boostRecent } }
      i18n { translationTable translatableFields { name type } }
      realtime { subscriptionFieldName }
    }
  }
}
```

The `_meta` resolver returns cached data — it is computed **once at schema build
time**, not per request.

## Architecture

Three files do the work; the flow is deliberately simple:

```
MetaSchemaPlugin (plugin.ts)
  ├─ schema.hooks.init                     → collectTablesMeta(build)  → setCachedTablesMeta(...)
  └─ schema.hooks.GraphQLObjectType_fields → (only on the Query type) extendQueryWithMetaField(fields, getCachedTablesMeta())
```

1. **`init` hook** walks `build.input.pgRegistry.pgResources`, and for each table
   resource in a configured schema builds a `TableMeta`
   (`table-meta-builder.ts` → `collectTablesMeta` / `buildTableMeta`). The result
   is memoized in a module-level cache (`cache.ts`).
2. **`GraphQLObjectType_fields` hook** fires for every object type but early-returns
   unless `context.Self.name === 'Query'`; then it appends the `_meta` field whose
   resolver just returns the cached `{ tables }`.
3. **`graphql-meta-field.ts`** constructs all the `Meta*` `GraphQLObjectType`s and
   the top-level `MetaSchema` type by hand (no PostGraphile codec plumbing — plain
   `graphql` types), so the shape is fully controlled here.

### Where each piece of metadata is built

| Metadata | Builder file | Source of truth |
|---|---|---|
| fields / types / enums | `type-mappings.ts` (`buildFieldMeta`) | codec attributes + gql type resolver |
| indexes, PK, unique, FK constraints | `constraint-meta-builders.ts` | `resource.uniques`, relations |
| belongsTo / hasOne / hasMany / manyToMany | `relation-meta-builders.ts` | `resource.getRelations()` |
| inflection names + root field names | `name-meta-builders.ts` | `build.inflection.*` |
| **storage** (`isFilesTable`,`isBucketsTable`) | `storage-search-meta-builders.ts` `buildStorageMeta` | `codec.extensions.tags.storageFiles` / `.storageBuckets` |
| **search** (algorithms, columns, unified, config) | `storage-search-meta-builders.ts` `buildSearchMeta` | tsvector/vector columns, `@bm25Index`, `@trgmSearch`, `@searchConfig` |
| **i18n** (translation table, translatable fields) | `storage-search-meta-builders.ts` `buildI18nMeta` | `@i18n` tag + text/citext column intersection |
| **realtime** (subscription field name) | `storage-search-meta-builders.ts` `buildRealtimeMeta` | `@realtime` tag |

The type contracts for all of these live in `types.ts` (`TableMeta` and friends).

## Smart-tag-driven metadata

Feature metadata is detected from **codec smart tags** —
`codec.extensions.tags.<tagName>`. These originate in the database as
PostgreSQL comments (`COMMENT ON TABLE ... IS E'@tag ...'`), which in
constructive-db are emitted by the metaschema generators via
`metaschema.append_table_smart_tags(table_id, jsonb_build_object('storageBuckets', true))`
(see `packages/metaschema-generators/.../storage_module.sql`). PostGraphile parses
those comments into `extensions.tags` during introspection.

So the contract for surfacing a DB concept in `_meta` is:
**emit a smart tag in SQL → read `codec.extensions.tags.<tag>` in a builder →
map it onto a `Meta*` GraphQL type.**

## Adding a new metadata block to `_meta`

Worked pattern (this is exactly how a `scope` block is being added — mirror the
`storage`/`search` precedent):

1. **(DB, if the data isn't already a physical column)** Emit a smart tag from the
   generator so it lands on the codec, e.g.
   `metaschema.append_table_smart_tags(v_table_id, jsonb_build_object('scope', v_scope))`
   at the single scope decision point (`apply_scope_fields.sql`), then
   `pgpm package` + `pnpm run generate:constructive`.
2. **`types.ts`** — add the interface (e.g. `ScopeMeta`) and a nullable field on
   `TableMeta` (`scope: ScopeMeta | null`).
3. **A builder** — add `buildScopeMeta(codec, build, inflectAttr): ScopeMeta | null`
   in `storage-search-meta-builders.ts` (or a new `scope-meta-builders.ts`). Read
   `codec.extensions.tags`, return `null` when the feature is absent (the
   convention across all builders). Optionally infer from physical columns as a
   fallback (e.g. `database_id` present → database scope) and record provenance.
4. **`table-meta-builder.ts`** — call the builder inside `buildTableMeta` next to
   `buildStorageMeta`/`buildSearchMeta` and add it to the returned object.
5. **`graphql-meta-field.ts`** — declare a `MetaScope` `GraphQLObjectType` and add
   the `scope` field to `MetaTableType` (nullable, with a description).
6. **Tests** — extend `__tests__/meta-schema.test.ts` and its snapshot
   (`__snapshots__/meta-schema.test.ts.snap`). Metadata is tested in-process with
   mocked PostGraphile build resources (no live DB). Add both a tagged fixture and,
   if you added inference, an untagged fixture.
   Run: `pnpm --filter graphile-settings exec jest --runInBand`

### Builder conventions (follow these)

- Return `null` (not an empty object) when the feature is not present — the
  GraphQL field is nullable and clients branch on presence.
- Read tags defensively: `(codec as any).extensions?.tags` may be undefined.
- Inflect column names before exposing them (`inflectAttr(attrName, codec)`), so
  `_meta` names match the GraphQL field names clients actually use.
- Keep detection logic pure and synchronous — it runs at build time over
  already-introspected resources.

## Why `_meta` matters for codegen

`_meta` is the machine-readable contract codegen consumes (endpoint URL, `.graphql`
file, or direct introspection). Beyond raw structure it gives codegen the
*semantics* it can't infer from SDL alone:

- **Root operation names** (`query { all one create update delete }`) and
  **inflection names** (`connection`, `edge`, input/payload types) — generate
  ORM/hooks/CLI without re-deriving inflection.
- **Storage** — generate upload/download/presigned-URL helpers only for
  files/buckets tables.
- **Search** — generate the right search filters/score fields per active
  algorithm and know when `unifiedSearch` exists.
- **i18n / realtime** — generate translation helpers and subscription hooks only
  where applicable.
- **Scope (planned)** — auto-inject `databaseId`/`orgId` scope keys from context,
  mark them non-required in create inputs, group/emit CLI & docs by tier, and
  choose the correct RLS/JWT context for generated test seeds.

## Presets & Plugins

| Export | Kind | Description |
|---|---|---|
| `MetaSchemaPreset` | preset | Adds the `_meta` query (bundled in `ConstructivePreset`) |
| `MetaSchemaPlugin` | plugin | The underlying plugin, usable a-la-carte |

## Common Pitfalls

| Issue | Cause | Fix |
|---|---|---|
| `_meta` field missing | `MetaSchemaPreset`/`Plugin` not loaded | Add the preset (or use `ConstructivePreset`) |
| Table missing from `_meta.tables` | Its schema isn't in the configured `pgSchemas`, or resource isn't a real table | Ensure the schema is in `makePgService({ schemas })`; virtual/function resources are skipped |
| `storage`/`search`/`i18n`/`realtime`/`scope` is `null` | No corresponding smart tag / column detected | Emit the smart tag in SQL (`append_table_smart_tags`) and re-introspect; verify `codec.extensions.tags` |
| Stale metadata after schema change | `_meta` is cached at build time | Rebuild the schema (server uses LISTEN/NOTIFY cache invalidation) |
| New field not appearing | Added to `types.ts`/builder but not to `graphql-meta-field.ts` | The GraphQL types are hand-declared — add the field to `MetaTableType` and its object type |

## Related Skills

- `graphile-search` — the search plugin whose activation `_meta.search` reflects
- `constructive-cli` / `constructive-graphql-codegen` — consumers of `_meta`
- `authoring-scoped-modules` (constructive-db) — the scope model `_meta.scope` will surface
