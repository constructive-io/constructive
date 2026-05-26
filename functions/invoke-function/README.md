# @constructive-io/invoke-function-fn

Knative function that processes function invocations. When a row is INSERTed into a `function_invocations` table, this handler:

1. Resolves the correct schema (public or private) from the module configuration
2. Reads the invocation row and validates the function definition
3. Dispatches execution to the underlying Knative function
4. Updates the invocation row with status, result, duration, and timestamps

## Schema Resolution

The function_module supports configurable schemas — tables can live in `infra_public`, `dataroom_public`, or any custom schema. This handler queries `metaschema_modules_public.function_module` to resolve the actual schema name at runtime, so it works with both public and private schema configurations.

## Job Payload

```json
{
  "id": "invocation-uuid",
  "schema": "infra_public",
  "table": "function_invocations"
}
```

Or the richer payload:

```json
{
  "invocation_id": "invocation-uuid",
  "schema": "dataroom_public",
  "invocations_table": "team_function_invocations",
  "definitions_table": "team_function_definitions"
}
```

## Invocation Lifecycle

```
pending → running → completed/failed
```

- `pending`: Row inserted, job enqueued
- `running`: Handler picked up, dispatching to function
- `completed`: Function returned success
- `failed`: Function returned error or handler caught exception

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `postgres` | PostgreSQL user |
| `PGPASSWORD` | `password` | PostgreSQL password |
| `PGDATABASE` | `postgres` | PostgreSQL database |
| `INTERNAL_GATEWAY_URL` | `http://localhost:8080` | Gateway URL for function dispatch |
| `INTERNAL_GATEWAY_DEVELOPMENT_MAP` | — | JSON map of task_identifier → function URL |
| `PORT` | `8080` | HTTP server port |
