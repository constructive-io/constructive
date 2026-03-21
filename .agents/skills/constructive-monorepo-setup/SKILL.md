# Constructive Monorepo Setup

Set up the Constructive monorepo for local development and testing.

## Prerequisites

- Node.js 20+
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
pgpm admin-users bootstrap --yes
pgpm admin-users add --test --yes

# 5. Build the monorepo
pnpm build

# 6. Run tests in a specific package
cd packages/<yourmodule>
pnpm test
```

## Docker Image

Use `docker.io/constructiveio/postgres-plus:18` which includes PostgreSQL with PostGIS, pgvector, pg_textsearch, pg_trgm, btree_gin, and uuid-ossp extensions.

For detailed Docker and pgpm usage, see the [pgpm skill](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/pgpm) in the public skills repo.

## Monorepo Navigation

See [AGENTS.md](../../AGENTS.md) at the repo root for the full navigation guide covering:
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

For detailed codegen configuration, see the [constructive-graphql skill](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-graphql) — specifically the [codegen.md reference](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-graphql/references/codegen.md).

## Graphile Plugin Development

Graphile plugins live under `graphile/*`. For PostGIS plugin development and testing, see the [constructive-graphql skill](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-graphql) — specifically the [search-postgis.md reference](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-graphql/references/search-postgis.md).

## Testing

See [AGENTS.md](../../AGENTS.md) for the testing framework selection guide. For comprehensive database testing patterns, see the [constructive-testing skill](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-testing).

## Related Skills

- [pgpm](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/pgpm) — Docker, migrations, deploy/verify/revert
- [constructive-graphql](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-graphql) — Codegen, search, PostGIS
- [constructive-testing](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-testing) — pgsql-test, drizzle-orm-test
- [constructive-tooling](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-tooling) — pnpm workspace, makage builds
- [constructive-setup](https://github.com/constructive-io/constructive-skills/tree/main/.agents/skills/constructive-setup) — Full setup guide (public skills repo)
