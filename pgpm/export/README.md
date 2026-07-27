# @pgpmjs/export

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/export"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Fexport%2Fpackage.json"/></a>
</p>

Export tools for extracting database migrations from existing PostgreSQL databases. Supports both direct SQL queries and GraphQL-based data fetching.

## Features

- **SQL Export** — Extract migrations directly from a PostgreSQL database via `pg` queries
- **GraphQL Export** — Extract migrations via a PostGraphile GraphQL endpoint
- **Cross-flow parity** — Both flows produce identical output for the same source data
- **Metadata export** — Export metaschema, services, and module metadata tables
- **Table-data export** — Generic deterministic row-data dumps (`exportTablesData`,
  `buildDataDeployScript` / `buildDataRevertScript` / `buildDataVerifyScript`): one
  INSERT per table in stable order, volatile-default columns excluded via pg_catalog
  volatility (no regex on default text), replayed under
  `session_replication_role = replica`, with ID-precise reverts and divide-by-zero
  verify checks. These scripts are the data/fixtures parts a `@pgpmjs/bundle`
  envelope ships. All SQL is emitted through `@constructive-io/query-builder`.

## Usage

```typescript
import { exportMigrations, exportGraphQL, GraphQLClient } from '@pgpmjs/export';
```
