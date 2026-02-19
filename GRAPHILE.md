# Graphile v5 RC Dependency Management

## Overview

This monorepo contains several packages that depend on the [Graphile](https://graphile.org/) v5 release candidate (RC) ecosystem. The Graphile v5 RC packages are **tightly coupled** -- all packages in the ecosystem must be at matching RC versions to work correctly.

## The Problem (Why We Pin)

Graphile v5 RC packages declare peer dependencies on each other. When a new RC is released, the minimum required versions of those peer deps often bump together. For example, `graphile-build-pg@5.0.0-rc.5` requires `@dataplan/pg@^1.0.0-rc.5` and `tamedevil@^0.1.0-rc.4`, whereas the earlier `rc.3` only required `rc.3` versions of those peers.

If our packages use loose caret ranges (e.g., `^5.0.0-rc.3`), the package manager may resolve to the **latest** RC (e.g., `rc.5` or `rc.7`), which introduces new peer dependency requirements that nothing in our tree satisfies. This causes cascading "missing peer dependency" warnings like:

```
graphile-build-pg 5.0.0-rc.5
  - missing peer @dataplan/pg@^1.0.0-rc.5
  - missing peer tamedevil@^0.1.0-rc.4
postgraphile 5.0.0-rc.7
  - missing peer @dataplan/pg@^1.0.0-rc.5
  - missing peer @dataplan/json@^1.0.0-rc.5
  - missing peer grafserv@^1.0.0-rc.6
  - missing peer tamedevil@^0.1.0-rc.4
```

## Our Approach: Pinned Exact Versions

All Graphile RC dependencies are pinned to **exact versions** (no `^` or `~` prefix). This ensures:

1. Every package in the monorepo uses the same RC version set
2. No version drift when new RCs are published
3. All peer dependency requirements are explicitly satisfied
4. Deterministic installs across environments

## Current Pinned Versions

| Package | Pinned Version |
|---------|---------------|
| `grafast` | `1.0.0-rc.7` |
| `grafserv` | `1.0.0-rc.6` |
| `graphile-build` | `5.0.0-rc.4` |
| `graphile-build-pg` | `5.0.0-rc.5` |
| `graphile-config` | `1.0.0-rc.5` |
| `graphile-utils` | `5.0.0-rc.6` |
| `pg-sql2` | `5.0.0-rc.4` |
| `postgraphile` | `5.0.0-rc.7` |
| `@dataplan/json` | `1.0.0-rc.5` |
| `@dataplan/pg` | `1.0.0-rc.5` |
| `tamedevil` | `0.1.0-rc.4` |
| `@graphile-contrib/pg-many-to-many` | `2.0.0-rc.1` |
| `postgraphile-plugin-connection-filter` | `3.0.0-rc.1` |

## Packages That Use Graphile

### `graphile/` packages

- **graphile-settings** -- Core settings/configuration for PostGraphile v5 (most deps, including the transitive peer deps `tamedevil`, `@dataplan/pg`, `@dataplan/json`, `grafserv`)
- **graphile-schema** -- Builds GraphQL SDL from PostgreSQL using PostGraphile v5
- **graphile-query** -- Executes GraphQL queries against PostGraphile v5 schemas
- **graphile-search-plugin** -- Full-text search plugin for PostGraphile v5
- **graphile-cache** -- LRU cache with PostGraphile v5 integration
- **graphile-test** -- PostGraphile v5 testing utilities
- **graphile-authz** -- Dynamic authorization plugin for PostGraphile v5
- **postgraphile-plugin-pgvector** -- pgvector similarity search plugin for PostGraphile v5

### `graphql/` packages

- **@constructive-io/graphql-server** -- GraphQL server with PostGraphile v5
- **@constructive-io/graphql-test** -- GraphQL testing with all plugins loaded
- **@constructive-io/graphql-query** -- GraphQL query builder
- **@constructive-io/graphql-explorer** -- GraphQL Explorer UI

**Important:** Having different versions of `grafast` (or other singleton graphile packages) installed in the same workspace causes runtime errors like `Preset attempted to register version 'X' of 'grafast', but version 'Y' is already registered`. This is why **all** packages must use the same pinned versions.

## Upgrading Graphile RC Versions

When upgrading to a new Graphile RC set:

1. Check the latest RC versions on npm for all packages listed in the table above
2. Verify peer dependency compatibility by running `npm view <package>@<version> peerDependencies` for each package
3. Update **all** packages in this table simultaneously -- do not upgrade one without the others
4. Update every `graphile/*/package.json` and `graphql/*/package.json` that references these packages
5. Run `pnpm install` to update the lockfile
6. Run `pnpm build` to verify no type errors
7. Run tests to verify nothing broke
8. Update the version table in this document
