# Local Dev Setup

Quick-start for running the Constructive GraphQL server locally with Docker Postgres and pgpm.

## Prerequisites

- Docker (for Postgres)
- Node.js v22+
- pgpm: `npm install -g pgpm`

## Start PostgreSQL

```bash
pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate
eval "$(pgpm env)"
pgpm admin-users bootstrap --client --yes
pgpm admin-users add --test --yes
```

> **Important:** `eval "$(pgpm env)"` must be run as a separate command (not chained with `&&`) so the env vars are available for subsequent commands.

## Deploy Your Database

Navigate to your pgpm database workspace and deploy:

```bash
cd /path/to/your-database
pgpm deploy
```

This runs all migrations in your `pgpm.plan` and provisions the schema. If your module hasn't been deployed before, add `--createdb` to create the database:

```bash
pgpm deploy --database myapp --createdb --yes
```

For full deploy options, see the **pgpm** skill: [references/deploy.md](../pgpm/references/deploy.md)

## Start GraphQL Server

```bash
cd graphql/server
PGDATABASE=myapp pnpm dev
```

Set `PGDATABASE` to match the database name you deployed to.

Health check: `curl -s -o /dev/null -w "%{http_code}" http://api.localhost:3000/graphql` → 405

## Endpoint Reference

| Endpoint | Purpose |
|---|---|
| `http://auth.localhost:3000/graphql` | Main auth |
| `http://api.localhost:3000/graphql` | Main public API |
| `http://auth-<db>.localhost:3000/graphql` | Per-DB auth |
| `http://app-public-<db>.localhost:3000/graphql` | Per-DB app API |
| `http://admin-<db>.localhost:3000/graphql` | Per-DB admin |

## Related

- **pgpm** skill — full deploy/revert/verify reference, Docker options, environment variables
- `constructive-sdk` skill — provision a user database after setup
