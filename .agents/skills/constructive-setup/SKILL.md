---
name: constructive-setup
description: "Set up the Constructive monorepo for development — install dependencies, start PostgreSQL via pgpm Docker, bootstrap users, build, run tests, and start local email services. Use when asked to 'set up constructive', 'get constructive running', 'set up dev environment', 'bootstrap database', 'start email services', 'test emails locally', or when starting work in the constructive-io/constructive repo."
metadata:
  author: constructive-io
  version: "1.0.0"
  triggers: "user, model"
---

# Constructive Monorepo Setup

Lightweight setup guide for getting the `constructive-io/constructive` monorepo running locally. References detailed skills for each subsystem instead of duplicating their content.

## When to Apply

Use this skill when:
- Setting up the Constructive monorepo for the first time
- Starting a new development session that needs a running database
- Troubleshooting a broken local environment

## Quick Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL via pgpm Docker
pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate
eval "$(pgpm env)"

# 3. Bootstrap database users
pgpm admin-users bootstrap --client --yes
pgpm admin-users add --test --yes

# 4. Build the monorepo
pnpm build

# 5. Run tests (from a specific package)
cd packages/yourmodule
pnpm test
```

## Step-by-Step Details

### 1. Install Dependencies

The monorepo uses pnpm workspaces:

```bash
pnpm install
```

### 2. Start PostgreSQL

Use pgpm's Docker integration to start a local PostgreSQL container. The `postgres-plus:18` image includes all required extensions (PostGIS, pgvector, uuid-ossp, etc.).

```bash
pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate
eval "$(pgpm env)"
```

> **Important:** `eval "$(pgpm env)"` must be run as a separate command (not chained with `&&`) because the env vars aren't available until the command completes.

For full Docker options (custom ports, names, passwords), see the **pgpm** skill: [references/docker.md](../pgpm/references/docker.md)

For environment variable details, see the **pgpm** skill: [references/env.md](../pgpm/references/env.md)

### 3. Bootstrap Database Users

Create the required PostgreSQL roles for Constructive's security model:

```bash
pgpm admin-users bootstrap --client --yes
pgpm admin-users add --test --yes
```

### 4. Build

```bash
pnpm build
```

This builds all packages in the monorepo. Required before running tests or starting servers.

### 5. Run Tests

Tests are run per-package:

```bash
cd packages/yourmodule   # or graphile/yourplugin, pgpm/core, etc.
pnpm test                # single run
pnpm test:watch          # watch mode
```

For testing patterns and frameworks, see the **constructive-testing** skill.

## Monorepo Layout

| Directory | Contents |
|-----------|----------|
| `packages/*` | Constructive CLI, ORM, query-builder, server-utils |
| `pgpm/*` | PGPM engine, CLI, shared types/logger/env |
| `graphql/*` | GraphQL server, explorer, codegen, types, query/react utilities |
| `graphile/*` | Graphile/PostGraphile plugins (postgis, search, etc.) |
| `postgres/*` | PostgreSQL tooling (pg-ast, pg-codegen, introspectron, pgsql-test) |
| `extensions/*` | PGPM extension modules |

For full navigation, see the repo's `AGENTS.md`.

### Local Development Environment

| Reference | Topic | Consult When |
|-----------|-------|--------------|
| [local-dev-setup.md](references/local-dev-setup.md) | Quick-start local dev | Docker Postgres + GraphQL server startup |
| [local-env.md](references/local-env.md) | Full local environment | Detailed setup, endpoint reference, troubleshooting |

## Cross-References

- **pgpm** skill — Database migrations, Docker, environment, CLI commands
- **constructive-testing** skill — Test frameworks (pgsql-test, drizzle-orm-test, supabase-test)
- **constructive-cli** skill — Generated CLI commands and scaffolding
