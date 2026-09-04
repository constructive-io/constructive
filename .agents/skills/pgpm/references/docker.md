
# PGPM Docker

Manage PostgreSQL Docker containers for local development using the `pgpm docker` command.

## When to Apply

Use this skill when:
- Setting up a local PostgreSQL database for development
- Starting or stopping PostgreSQL containers
- Recreating a fresh database container
- User asks to run tests that need a database
- Troubleshooting database connection issues

## Quick Start

Docker is optional. If a PostgreSQL server is already running (check with
`pg_isready -h localhost -p 5432`), export `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD` for a
superuser and skip this reference entirely — do not stop that server to make room for
the container. If you want both, start the container on another port (`--port 5433`)
and `export PGPORT=5433`.

### Start PostgreSQL Container

```bash
pgpm docker start
```

This starts a PostgreSQL 17 container with default settings:
- Container name: `postgres`
- Port: `5432`
- User: `postgres`
- Password: `password`

### Start with Custom Options

```bash
pgpm docker start --port 5433 --name my-postgres
```

### Recreate Container (Fresh Database)

```bash
pgpm docker start --recreate
```

### Stop Container

```bash
pgpm docker stop
```

## Command Reference

### pgpm docker start

Start a PostgreSQL Docker container.

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Container name | `postgres` |
| `--image <image>` | Docker image | `docker.io/constructiveio/postgres-plus:18` |
| `--port <port>` | Host port mapping | `5432` |
| `--user <user>` | PostgreSQL user | `postgres` |
| `--password <pass>` | PostgreSQL password | `password` |
| `--recreate` | Remove and recreate container | `false` |

### pgpm docker stop

Stop a running PostgreSQL container.

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Container name to stop | `postgres` |

## Common Workflows

### Development Setup

```bash
# Start fresh database
pgpm docker start --recreate

# Load environment variables
eval "$(pgpm env)"

# Deploy your PGPM modules
pgpm deploy
```

### Running Tests

```bash
# Ensure database is running
pgpm docker start

# Run tests with environment
pgpm env pnpm test
```

### Multiple Databases

```bash
# Start main database on default port
pgpm docker start --name main-db

# Start test database on different port
pgpm docker start --name test-db --port 5433
```

## PostgreSQL Version

The default image `docker.io/constructiveio/postgres-plus:18` includes PostgreSQL 17 which is required for:
- `security_invoker` views
- Latest PostgreSQL features used by Constructive

If you see errors like "unrecognized parameter security_invoker", ensure you're using PostgreSQL 17+.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Docker is not installed" | Install Docker Desktop or Docker Engine |
| "Port already in use" | If it's a running Postgres, use it (export PG*) instead of Docker; otherwise `--port 5433` + `export PGPORT=5433`. Never stop a developer's own server |
| Container won't start | Check `docker logs postgres` for errors |
| "Container already exists" | Use `--recreate` to remove and recreate |
| Permission denied | Ensure Docker daemon is running and user has permissions |

## Environment Variables

After starting the container, use `pgpm env` to set up environment variables:

```bash
eval "$(pgpm env)"
```

This sets:
- `PGHOST=localhost`
- `PGPORT=5432`
- `PGUSER=postgres`
- `PGPASSWORD=password`
- `PGDATABASE=postgres`

## References

For related references:
- Environment management: See `references/env.md`
- Running tests: See `references/testing.md`
