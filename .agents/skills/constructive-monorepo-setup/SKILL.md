---
name: constructive-monorepo-setup
description: "Set up and navigate the Constructive monorepo for local development. Use for Node and pnpm prerequisites, Docker PostgreSQL, workspace builds and tests, SDK regeneration, or Graphile plugin development."
---

# Constructive Monorepo Setup

Set up the Constructive monorepo for local development and testing.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)
- pgpm CLI (`npm install -g pgpm`)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL via pgpm Docker
pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate

# 3. Load environment variables
eval "$(pgpm env)"

# 4. Bootstrap admin users for testing
pgpm admin-users bootstrap --client --yes
pgpm admin-users add --test --yes

# 5. Build the monorepo
pnpm build

# 6. Run tests in a specific package
cd packages/<yourmodule>
pnpm test
```

## Docker Image

Use `docker.io/constructiveio/postgres-plus:18` which includes PostgreSQL with PostGIS, pgvector, pg_textsearch, pg_trgm, btree_gin, and uuid-ossp extensions.

For detailed Docker and pgpm usage, see the [pgpm skill](../pgpm/SKILL.md) in this repo.

## Monorepo Navigation

See [AGENTS.md](../../../AGENTS.md) at the repo root for the full navigation guide covering:
- Package layout (`packages/*`, `pgpm/*`, `graphql/*`, `postgres/*`, `graphile/*`)
- Entry points (PGPM CLI, Constructive CLI, GraphQL Server)
- Environment configuration patterns
- Testing framework selection guide

## Code Generation (SDK)

To regenerate the GraphQL SDK after schema changes:

```bash
# Generate types, hooks, ORM, and CLI from a running GraphQL endpoint
cnc codegen
```

Skills are auto-generated to `.agents/skills/` when `docs.skills: true` is set in the codegen config.

For detailed codegen configuration, see the [Constructive Codegen skill](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-codegen).

## Graphile Plugin Development

Graphile plugins live under `graphile/*`. Start with the [Graphile PostGIS skill](../graphile-postgis/SKILL.md) for spatial plugin development.

For exposing cross-table PostGIS queries to the ORM/GraphQL layer via `@spatialRelation` smart tags and the `RelationSpatial` blueprint node (point-in-polygon, radius search, etc. without sending GeoJSON to the client), see the [graphile-postgis skill](../graphile-postgis/SKILL.md) in this repo.

## Testing

See [AGENTS.md](../../../AGENTS.md) for the testing framework selection guide. For comprehensive database testing patterns, see the [constructive-testing skill](../constructive-testing/SKILL.md).

## Related Skills

- [pgpm](../pgpm/SKILL.md) — Docker, migrations, deploy/verify/revert
- [constructive-codegen](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-codegen) — GraphQL client generation
- [constructive-testing](../constructive-testing/SKILL.md) — pgsql-test, drizzle-orm-test
- [constructive-pnpm](../constructive-pnpm/SKILL.md) — pnpm workspace, makage builds
- [constructive-setup](../constructive-setup/SKILL.md) — Full setup guide
