# @pgpmjs/core

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/core"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Fcore%2Fpackage.json"/></a>
</p>

## Overview

pgpm Core is the main package for pgpm, providing tools for database migrations, package management, and package scaffolding. It includes functionality for:

- Managing PostgreSQL extensions and modules
- Deploying, reverting, and verifying migrations
- Parsing and generating migration plans
- Reading and writing SQL scripts
- Resolving dependencies between migrations

## Configuration

### Error Output Configuration

When migrations fail, pgpm provides detailed error output including query history. For large deployments with many migrations, this output can be verbose. The following environment variables control error output formatting:

| Variable | Default | Description |
|----------|---------|-------------|
| `PGPM_ERROR_QUERY_HISTORY_LIMIT` | `30` | Maximum number of queries to show in error output. Earlier queries are omitted with a count. |
| `PGPM_ERROR_MAX_LENGTH` | `10000` | Maximum characters for error output. Output exceeding this is truncated. |
| `PGPM_ERROR_VERBOSE` | `false` | Set to `true` to disable all limiting and show full error output. |

#### Smart Query Collapsing

Error output automatically collapses consecutive identical queries (like repeated `pgpm_migrate.deploy` calls) into a summary showing:
- The range of query numbers (e.g., "2-57")
- The total count (e.g., "56 calls")
- For deploy calls: the first and last change names for context

Example collapsed output:
```
Query history for this transaction:
  1. BEGIN
  2-57. CALL pgpm_migrate.deploy($1::TEXT, ...) (56 calls)
       First: schemas/metaschema_public/tables/extension/table
       Last:  schemas/metaschema_modules_public/tables/permissions_module/table
  58. ROLLBACK
```

To see full uncompressed output, set `PGPM_ERROR_VERBOSE=true`.
