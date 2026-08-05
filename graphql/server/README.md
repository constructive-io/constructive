# @constructive-io/graphql-server

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-server"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fserver%2Fpackage.json"/></a>
</p>

**Constructive GraphQL Server** is an Express-based server built on PostGraphile. It reads Constructive metadata to select API schemas, applies RLS-aware auth, and exposes a production-ready GraphQL API.

## 🚀 Quick Start

### Use as SDK

Install the package:

```bash
pnpm add @constructive-io/graphql-server @constructive-io/graphql-env
```

Start a server:

```ts
import { getEnvOptions } from '@constructive-io/graphql-env';
import { GraphQLServer } from '@constructive-io/graphql-server';

GraphQLServer(
  getEnvOptions({
    pg: { database: 'constructive_db' },
    server: { host: '0.0.0.0', port: 3000 },
  })
);
```

> **Tip:** Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` to control DB connectivity.
> See [Configuration](#configuration) for the full list of supported env vars and defaults.

### Local Development (this repo)

```bash
pnpm install
cd graphql/server
pnpm dev
```

This starts the server with env defaults from `@constructive-io/graphql-env`.

> **Tip:** Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` to control DB connectivity.
> See [Configuration](#configuration) for the full list of supported env vars and defaults.

## What it does

Runs an Express server that wires CORS, uploads, domain parsing, auth, and PostGraphile into a single GraphQL endpoint. It serves `/graphql` and `/graphiql`, injects per-request `pgSettings`, and flushes cached schemas on demand or via database notifications. When meta API is enabled, it resolves API config (schemas, roles, modules) from the meta schema using the request host and enforces `api.isPublic`, with optional header overrides in private mode; when meta API is disabled, it serves the fixed schemas and roles from `api.exposedSchemas`, `api.anonRole`, and `api.roleName`.

## Key Features

- Automatic GraphQL API generation from PostgreSQL schemas
- RLS-aware authentication and per-request `pgSettings`
- Meta-schema routing by domain + subdomain
- File uploads via `graphql-upload`
- GraphiQL and health check endpoints
- Schema cache flush via authenticated `/flush` or database notifications
- Opt-in observability for memory, DB activity, and Graphile build debugging

## Observability

`@constructive-io/graphql-server` includes an opt-in observability mode for local debugging.

- Master switch: `GRAPHQL_OBSERVABILITY_ENABLED=true`
- Debug routes: `GET /debug/memory`, `GET /debug/db`
- Background sampler: periodic NDJSON snapshots under `graphql/server/logs/`
- CLI helpers:
  - `pnpm debug:memory:analyze`
  - `pnpm debug:heap:capture`

Observability only activates when all of the following are true:

- `GRAPHQL_OBSERVABILITY_ENABLED=true`
- `NODE_ENV=development`
- the server is bound to a loopback host such as `localhost`, `127.0.0.1`, or `::1`

When those conditions are not met, the debug routes are not mounted and the sampler does not start. This keeps the default runtime surface minimal and prevents the observability layer from being exposed remotely.

For the operational workflow, sampler output, and heap snapshot usage, see [docs/memory-debugging.md](./docs/memory-debugging.md).

## Routes

- `GET /healthz` -> health check
- `GET /graphiql` -> GraphiQL UI
- `GET /graphql` / `POST /graphql` -> GraphQL endpoint
- `POST /graphql` (multipart) -> file uploads
- `POST /flush` -> clears the current API's cached Graphile schema; requires `X-Constructive-Internal-Token`
- `GET /debug/memory` -> memory/process/Graphile debug snapshot when observability is enabled
- `GET /debug/db` -> PostgreSQL activity/locks/pool debug snapshot when observability is enabled

## Scoped routing

This is a production-only server: every request is resolved through the scoped-routing plane. There is no static single-tenant mode and no flag to disable routing. For single-database local development without route resolution or a database id, use [`@constructive-io/graphql-dev-server`](../dev-server/README.md).

- The server resolves every request host with a fresh `resolve_route()` call against the compiled route bindings in the scoped routing schema (`API_ROUTING_SCHEMA`, default `routing_public`), mapping host → tenant/api/database/role. Routing metadata is not served from the process cache because a missed notification must never retain an old hostname-to-tenant assignment.
- Only APIs where `api.is_public` matches `API_IS_PUBLIC` are served.
- In private mode (`API_IS_PUBLIC=false`), an internal caller can select an authoritative surface with these headers only when it also supplies the exact `X-Constructive-Internal-Token` configured by `GRAPHQL_INTERNAL_REQUEST_SECRET`:
  - `X-Api-Name` + `X-Database-Id`
- `X-Meta-Schema` is a privileged, potentially cross-tenant control-plane API. It is rejected by default and can only be enabled with `API_ALLOW_META_SCHEMA_HEADER=true` on a separate private admin ingress; it is never a tenant-routing mechanism.
- `X-Schemata` is rejected even from an authenticated internal caller because an unchecked physical schema list is not a tenant-safe routing contract. Provision an API record and select it by name instead.
- The ingress must remove any caller-supplied reserved headers before injecting its own token and selectors, and the hop to this server must use an authenticated encrypted channel.
- A resolved database id is always required. There is no default database, so a request that resolves without a database id is rejected (`NO_DATABASE_ID` → HTTP 500).

Production multi-tenant execution requires `runtimePgResolver`. The server calls
it once per request with the credential-free exact route contract: database id,
physical database name, API id, ordered physical schemas, and roles in
`[anonymous, authenticated]` order. The result must contain an explicit user,
password, and matching database; `connectionString` and control-plane credential
fallbacks are rejected. The secret-bearing result remains in a server-owned
`WeakMap`, while Express context and Graphile consume the same frozen resolution
and independently verify its opaque pool identity.

```typescript
GraphQLServer({
  pg: controlPlanePg,
  graphile: { introspectionMode: 'scoped-required' },
  runtimePgResolver: async ({ databaseId, databaseName, apiId, schemas, roles }) => {
    const login = await credentialStore.get({
      databaseId,
      databaseName,
      apiId,
      schemas,
      roles
    });
    return {
      database: databaseName,
      user: login.user,
      password: login.password
    };
  }
});
```

`runtimePg` remains a compatibility path for one statically configured route.
In production or `scoped-required` mode it must include an explicit database and
be paired with an exact credential-free `runtimePgStaticIdentity`; any request
whose database/API/schema/role contract differs fails closed. A dynamic server
must use the resolver even when several databases happen to share a login.

The resolver is part of the trusted routing boundary and must key its lookup by
immutable `databaseId`. The server requires its normalized host, port, database,
and TLS policy to match the control-plane tenant connection exactly, then binds
the complete target/login/pool contract into an opaque identity and rechecks the
route before every consumer reads it. A deployment where tenant databases live
on different network endpoints needs one future per-route resolver shared by
both control and runtime lanes; this implementation rejects that topology
rather than authenticating/configuring against one server and executing against
another.

## Configuration

Configuration is merged from defaults, config files, and env vars via `@constructive-io/graphql-env`. See `graphql/env/README.md` for the full list and examples.

| Env var                        | Purpose                               | Default                                                       |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------- |
| `PGHOST`                       | Postgres host                         | `localhost`                                                   |
| `PGPORT`                       | Postgres port                         | `5432`                                                        |
| `PGUSER`                       | Postgres user                         | `postgres`                                                    |
| `PGPASSWORD`                   | Postgres password                     | `password`                                                    |
| `PGDATABASE`                   | Postgres database                     | `postgres`                                                    |
| `GRAPHILE_SCHEMA`              | Comma-separated schemas to expose     | empty                                                         |
| `GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE` | Reuse or destroy the exact catalog-introspection client after gather | `reuse` |
| `GRAPHILE_REALTIME_SCHEMA`     | Exact schema containing realtime cursor functions | `realtime_public`                                  |
| `GRAPHILE_REALTIME_NOTIFICATION_MODE` | Dedicated subscriber or opt-in exact-topic broker | `dedicated` |
| `GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS` | Maximum age of shared-listener role audit | `60000` |
| `GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS` | Cursor recovery poll interval | `5000` |
| `GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS` | Cursor listener heartbeat interval | `30000` |
| `GRAPHILE_RELEASE_BUILD_STATE_AFTER_VALIDATION` | Release schema-construction-only state after successful validation | `false` |
| `FEATURES_SIMPLE_INFLECTION`   | Enable simple inflection              | `true`                                                        |
| `FEATURES_OPPOSITE_BASE_NAMES` | Enable opposite base names            | `true`                                                        |
| `FEATURES_POSTGIS`             | Enable PostGIS support                | `true`                                                        |
| `API_ROUTING_SCHEMA`    | Schema containing `resolve_route()`   | `routing_public`                                 |
| `API_IS_PUBLIC`                | Serve public APIs only                | `true`                                                        |
| `API_EXPOSED_SCHEMAS`          | Additional schemas to expose          | empty                                                         |
| `API_META_SCHEMAS`             | Meta schemas to query                 | `routing_public,metaschema_public,metaschema_modules_public` |
| `API_ALLOW_META_SCHEMA_HEADER` | Enable the privileged metadata admin surface on an isolated private ingress | `false` |
| `API_ANON_ROLE`                | Anonymous role name                   | `administrator`                                               |
| `API_ROLE_NAME`                | Authenticated role name               | `administrator`                                               |
| `GRAPHQL_INTERNAL_REQUEST_SECRET` | Minimum-32-byte token for reserved routing, actor-identity, and cache-administration headers | empty; reserved headers fail closed |
| `GRAPHQL_ROUTING_CACHE_MAX_ENTRIES` | Resolved routing/service labels retained per process; must be at least the effective Graphile resident capacity | `max(1024, effective Graphile capacity)` |
| `GRAPHQL_OBSERVABILITY_ENABLED` | Master switch for debug routes and sampler | `false`                                                  |
| `GRAPHQL_OBSERVABILITY_TOKEN` | Bearer token (minimum 32 bytes) required for loopback-only production observability | empty |
| `GRAPHQL_DEBUG_SAMPLER_ENABLED` | Enables periodic NDJSON sampling when observability is on | `true`                                   |
| `GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS` | Sampler interval in milliseconds | `10000`                                                       |
| `GRAPHQL_DEBUG_SAMPLER_DIR`    | Override output directory for sampler logs | `graphql/server/logs`                                     |
| `GRAPHILE_BUILD_WATCHDOG_MS`   | Latch schema-build admission unhealthy after one admitted build exceeds this duration; recovery requires a process restart | `300000` |

The build watchdog never cancels or releases an overdue build, because JavaScript
and plugin work cannot be canceled safely. It rejects queued and subsequent
builds with `GRAPHILE_BUILD_STUCK_RESTART_REQUIRED`, prevents late publication,
and leaves resident handlers available while the process is restarted.

Programmatic `graphile.extends` and `graphile.preset` values are applied after
Constructive's feature preset, so trusted caller plugins and ordinary Graphile
schema/runtime settings take effect. They cannot replace the exact tenant
`pgServices`, security-GUC context, GraphQL/WebSocket transport policy, error
masking, or server-owned auth/admission plugins; explicit attempts fail startup
with `GRAPHILE_PROTECTED_PRESET_OVERRIDE`. Graphile plugins execute trusted
server-side code, so this boundary prevents structural misconfiguration rather
than sandboxing a hostile plugin implementation.

The routing cache stores host/header labels and their resolved API metadata. Its
capacity is independent from Graphile build identity: evicting a routing label
causes the next request to resolve that label again, but it never disposes a
valid resident Graphile instance. `/debug/memory` reports its size, capacity,
hits, misses, and capacity/TTL evictions.

`GRAPHILE_REALTIME_SCHEMA` changes only the exact cursor-function schema for an
API whose database settings enable realtime. Cursor events are accepted only
from that API's exposed physical schemas. A foreign cursor row or lost
subscriber emitter latches that exact generation unavailable, and the next HTTP
request receives `503 GRAPHILE_REALTIME_UNAVAILABLE` instead of entering its
Graphile handler. The failed generation is identity-checked and retired so the
following request can build a fresh one without a stale callback evicting a
healthy replacement. Realtime-enabled cached instances expose a no-server
Grafserv upgrade handler. The shared server routes `/graphql` upgrades through
the same API resolution, origin, authentication, request-context, build
contract, runtime-role, listener-attestation, and cache-admission path as HTTP;
other paths and failed admission close with stable metadata-free errors.
Accepted sockets retain their exact cache generation until close and are
destroyed before that generation is disposed.

`GRAPHILE_REALTIME_NOTIFICATION_MODE=shared-exact` is an experimental,
default-off transport seam and additionally requires a
`notificationPgResolver` in `ConstructiveOptions`. It must return explicit
credentials for a dedicated listener login and the exact routed physical
database; runtime or control-plane credentials are never a fallback. The
listener identity in a Graphile build contract is an opaque digest, and raw
connection configuration is neither serialized into the contract nor exposed
through cache statistics. The transport remains experimental until the hostile
cross-tenant subscription suite and loaded churn qualification pass on the
production-shaped fixture; the upgrade router itself is now production-wired
and fail-closed.

## Testing

Use `supertest` or your HTTP client of choice against `/graphql`. For RLS-aware tests, provide a `Bearer` token and ensure the API's auth function is available.

## Related Packages

- `@constructive-io/graphql-env` - env parsing + defaults for GraphQL
- `@constructive-io/graphql-types` - shared types and defaults
- `graphile-settings` - PostGraphile configuration
- `graphile-meta-schema` - meta schema support
