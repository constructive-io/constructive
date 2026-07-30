# graphile-meta

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-meta"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-meta%2Fpackage.json"/></a>
</p>

PostGraphile v5 plugin exposing a single `_meta` root query that describes each table exposed by the final GraphQL schema, including fields, indexes, constraints, relations, inflection names, root query/mutation names, and smart-tag-derived metadata (storage, search, i18n, realtime).

## Overview

Standard GraphQL introspection tells you about the GraphQL schema — `_meta` adds the **database identities** behind its exposed objects. `MetaSchemaPlugin` reconciles the PostGraphile registry with the final executable schema and caches a `TableMeta` entry per exposed table, covering:

- **Tables and fields** — exact PostgreSQL names alongside final GraphQL names, plus Postgres type, GraphQL type, nullability, defaults, primary/foreign key flags, and scalar encoding hints (how to serialize bigints, datetimes, vectors, geojson, …)
- **Indexes & constraints** — primary key, unique constraints, foreign keys with referenced tables
- **Relations** — `belongsTo`, `hasOne`, `hasMany`, and `manyToMany` with the exact generated field names
- **Inflection** — the type names and root field names PostGraphile generated (`tableType`, `allRows`, `connection`, `createInputType`, …)
- **Root operations** — the query/mutation names for `all`, `one`, `create`, `update`, `delete`
- **Feature metadata from smart tags** — `storage` (`@storageFiles` / `@storageBuckets`), `search` (tsvector/BM25/pg_trgm/pgvector columns), `i18n` (translation tables and translatable fields), and `realtime` (subscription field names)

The first `_meta` execution reconciles metadata against that request's final schema; subsequent requests for the same schema return the cached result. Schema construction also seeds the legacy metadata cache for existing codegen consumers.

## Why it exists: dynamic queries

`_meta` exists to power **dynamic queries** with [`@constructive-io/graphql-query`](https://github.com/constructive-io/constructive/tree/main/graphql/query): clients introspect `_meta` at runtime and build queries/mutations on the fly — no generated code, no build step. It is also the backbone of [`@constructive-io/graphql-codegen`](https://github.com/constructive-io/constructive/tree/main/graphql/codegen), which uses `_meta` to generate typed ORMs, React Query hooks, and CLIs.

## Usage

Extend your preset with `MetaSchemaPreset` (already included in `ConstructivePreset` from `graphile-settings`):

```typescript
import { MetaSchemaPreset } from 'graphile-meta';

const preset: GraphileConfig.Preset = {
  extends: [MetaSchemaPreset],
};
```

### Querying `_meta`

```graphql
query {
  _meta {
    tables {
      name
      tableName
      schemaName
      fields {
        name
        columnName
        type { pgType gqlType isArray }
        isNotNull
        hasDefault
        isPrimaryKey
        isForeignKey
      }
      indexes { name isUnique isPrimary columns }
      constraints {
        primaryKey { name }
        unique { name }
        foreignKey { name referencedTable }
      }
      relations {
        belongsTo { fieldName references { name } }
        hasMany { fieldName referencedBy { name } }
        manyToMany { fieldName rightTable { name } }
      }
      inflection { tableType allRows connection edge createInputType }
      query { all one create update delete }
      storage { isFilesTable isBucketsTable }
      search { algorithms columns { name algorithm } hasUnifiedSearch }
      i18n { translationTable translatableFields { name type } }
      realtime { subscriptionFieldName }
    }
  }
}
```

Example response snippet:

```json
{
  "_meta": {
    "tables": [
      {
        "name": "User",
        "tableName": "users",
        "schemaName": "app_public",
        "fields": [
          { "name": "id", "columnName": "id", "type": { "pgType": "uuid", "gqlType": "UUID", "isArray": false }, "isNotNull": true, "hasDefault": true, "isPrimaryKey": true, "isForeignKey": false },
          { "name": "displayName", "columnName": "display_name", "type": { "pgType": "text", "gqlType": "String", "isArray": false }, "isNotNull": true, "hasDefault": false, "isPrimaryKey": false, "isForeignKey": false }
        ],
        "inflection": { "tableType": "User", "allRows": "users", "connection": "UserConnection" },
        "query": { "all": "users", "one": null, "create": "createUser", "update": "updateUser", "delete": "deleteUser" }
      }
    ]
  }
}
```

`name` and `fields.name` are final GraphQL names. `tableName` and
`fields.columnName` preserve the corresponding PostgreSQL identifiers. An
operation under `query` is `null` when that field was not emitted in the final
GraphQL schema.

### Pairing with @constructive-io/graphql-query

```typescript
import { convertFromMetaSchema, validateMetaObject } from '@constructive-io/graphql-query';

// Fetch the _meta query result once at runtime, convert it to a meta object,
// then drive dynamic query/mutation generation from it
const metaObject = convertFromMetaSchema(metaQueryResult);
const { valid } = validateMetaObject(metaObject);
```

## Exports

| Export | Description |
|--------|-------------|
| `MetaSchemaPlugin` | The plugin (default export too) |
| `MetaSchemaPreset` | Preset wrapping the plugin |
| `TableMeta`, `FieldMeta`, `TypeMeta`, `IndexMeta`, `ConstraintsMeta`, `RelationsMeta`, `InflectionMeta`, `QueryMeta`, … | Type contracts for the `_meta` payload |

## Related

- [`graphile-settings`](https://github.com/constructive-io/constructive/tree/main/graphile/graphile-settings) — re-exports this plugin as part of `ConstructivePreset`
- [`@constructive-io/graphql-query`](https://github.com/constructive-io/constructive/tree/main/graphql/query) — runtime dynamic query building driven by `_meta`
- [`@constructive-io/graphql-codegen`](https://github.com/constructive-io/constructive/tree/main/graphql/codegen) — code generation driven by `_meta`
