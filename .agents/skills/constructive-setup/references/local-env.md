# Constructive Local Environment Setup

Set up a fully working local Constructive environment with PostgreSQL and the GraphQL server. Enables developing against a real GraphQL API and running tests.

## When to Apply

Use this reference when:
- Setting up a local development environment for Constructive
- Needing a running GraphQL server for development
- Troubleshooting local environment issues

## Prerequisites

- Docker installed and running
- Node.js 22+
- pnpm installed

## Step-by-Step Setup

### 1. Install pgpm globally

```bash
npm install -g pgpm
```

### 2. Start PostgreSQL via pgpm Docker

```bash
pgpm docker start --image docker.io/constructiveio/postgres-plus:18 --recreate
```

Uses the `postgres-plus:18` container (includes PostGIS, pgvector, and other required extensions). PostgreSQL 17+ is required due to `security_invoker` views.

### 3. Set environment variables

```bash
eval "$(pgpm env)"
```

Sets `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` for the local PostgreSQL instance.

**Important**: Run this as a separate command (not chained with `&&`) so the env vars are available for subsequent commands.

### 4. Bootstrap database users

```bash
pgpm admin-users bootstrap --client --yes
pgpm admin-users add --test --yes
```

### 5. Deploy your database

Navigate to your pgpm database workspace and deploy:

```bash
cd /path/to/your-database
pgpm deploy --database myapp --createdb --yes
```

This runs all migrations in your `pgpm.plan` and provisions the full schema (tables, functions, triggers, RLS policies). For an existing database, omit `--createdb`:

```bash
pgpm deploy
```

For full deploy options, see the **pgpm** skill.

### 6. Install dependencies and start server

```bash
cd /path/to/constructive
pnpm install
pnpm build
cd graphql/server
PGDATABASE=myapp pnpm dev
```

Set `PGDATABASE` to match the database name you deployed to.

The server starts with subdomain-based routing:

| Target | Endpoint |
|--------|----------|
| Public | `http://api.localhost:3000/graphql` |
| Auth | `http://auth.localhost:3000/graphql` |
| Objects | `http://objects.localhost:3000/graphql` |
| Admin | `http://admin.localhost:3000/graphql` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `postgres` | PostgreSQL user |
| `PGPASSWORD` | `password` | PostgreSQL password |
| `PGDATABASE` | `constructive` | Target database |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "security_invoker" error | Need PostgreSQL 17+. Use `pgpm docker start --image docker.io/constructiveio/postgres-plus:18` |
| "permission denied for schema" | Token not set or expired. Re-authenticate |
| Server not responding | Verify with `curl -s http://api.localhost:3000/graphql -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}'` |
