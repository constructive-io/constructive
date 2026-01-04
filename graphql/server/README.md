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

## Quick Start

### Use as SDK

Install the package:

```bash
pnpm add @constructive-io/graphql-server @constructive-io/graphql-env
```

Start a server using the `Server` class:

```ts
import { getEnvOptions } from '@constructive-io/graphql-env';
import { Server } from '@constructive-io/graphql-server';

const server = new Server(
  getEnvOptions({
    pg: { database: 'constructive_db' },
    server: { host: '0.0.0.0', port: 3000 }
  })
);

server.addEventListener();
server.listen();
```

Or use the `GraphQLServer` helper function for a one-liner:

```ts
import { getEnvOptions } from '@constructive-io/graphql-env';
import { GraphQLServer } from '@constructive-io/graphql-server';

GraphQLServer(
  getEnvOptions({
    pg: { database: 'constructive_db' },
    server: { host: '0.0.0.0', port: 3000 }
  })
);
```

> **Tip:** Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` to control DB connectivity.
See [Configuration](#configuration) for the full list of supported env vars and defaults.

### Local Development (this repo)

```bash
pnpm install
cd graphql/server
pnpm dev
```

This starts the server with env defaults from `@constructive-io/graphql-env`.

## What it does

Runs an Express server that wires CORS, uploads, domain parsing, auth, and PostGraphile into a single GraphQL endpoint. It serves `/graphql` and `/graphiql`, injects per-request `pgSettings`, and flushes cached schemas on demand or via database notifications. When meta API is enabled, it resolves API config (schemas, roles, modules) from the meta schema using the request host and enforces `api.isPublic`, with optional header overrides in private mode; when meta API is disabled, it serves the fixed schemas and roles from `api.exposedSchemas`, `api.anonRole`, `api.roleName`, and `api.defaultDatabaseId`.

## Key Features

- Automatic GraphQL API generation from PostgreSQL schemas
- RLS-aware authentication and per-request `pgSettings`
- Meta-schema routing by domain + subdomain
- Multi-level CORS handling (fallback, per-API, localhost)
- File uploads via `graphql-upload`
- GraphiQL and health check endpoints
- Two-tier schema caching with flush via `/flush` or database notifications
- API modules for extensibility (CORS, public key auth, RLS)

## Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/healthz` | GET | Health check, returns `ok` |
| `/graphiql` | GET | GraphiQL interactive UI |
| `/graphql` | GET, POST | GraphQL endpoint |
| `/graphql` | POST (multipart) | File uploads |
| `/flush` | POST | Clears cached Graphile schema for the current API |

## Meta API Routing

When `API_ENABLE_META=true` (default):

- The server resolves APIs from `meta_public.domains` using the request host.
- Only APIs where `api.is_public` matches `API_IS_PUBLIC` are served.
- In private mode (`API_IS_PUBLIC=false`), you can override with headers:
  - `X-Api-Name` + `X-Database-Id` - Route by API name
  - `X-Schemata` + `X-Database-Id` - Expose specific schemas directly
  - `X-Meta-Schema` + `X-Database-Id` - Expose only meta schemas

When `API_ENABLE_META=false`:

- The server skips meta lookups and serves the fixed schemas in `API_EXPOSED_SCHEMAS`.
- Roles and database IDs come from `API_ANON_ROLE`, `API_ROLE_NAME`, and `API_DEFAULT_DATABASE_ID`.

## Authentication

The server supports RLS-aware authentication via Bearer tokens. Authentication is **conditional** - it only occurs when a Bearer token is provided.

### Authentication Flow

```
Request arrives
       │
       ├── Has Authorization: Bearer <token>?
       │         │
       │         ▼ YES
       │   Call RLS authenticate function
       │     SELECT * FROM "<privateSchema>"."<authenticate>"($token)
       │         │
       │         ├── Token valid → Set authenticated pgSettings
       │         │                  - role = roleName
       │         │                  - jwt.claims.user_id
       │         │                  - jwt.claims.token_id
       │         │
       │         └── Token invalid → Return GraphQL error (UNAUTHENTICATED)
       │
       └── NO → Set anonymous pgSettings
                  - role = anonRole
                  - jwt.claims.database_id (still set)
                  - jwt.claims.ip_address (still set)
       │
       ▼
Execute GraphQL query
```

### JWT Claims

| Claim | Description | Set When |
|-------|-------------|----------|
| `jwt.claims.user_id` | Authenticated user ID | Authenticated only |
| `jwt.claims.token_id` | Token ID from auth function | Authenticated only |
| `jwt.claims.database_id` | Current database ID | Always |
| `jwt.claims.ip_address` | Client IP address | Always |
| `jwt.claims.origin` | Request origin header | If header present |
| `jwt.claims.user_agent` | Request user agent | If header present |

### Anonymous Requests

Without a Bearer token, requests use `anonRole` from the API config. The `jwt.claims.database_id` and other context values are still set for RLS policies.

### Strict Auth Mode

Set `SERVER_STRICT_AUTH=true` to require Bearer tokens. When enabled:
- Requests without a token use the `authenticateStrict` function instead of `authenticate`
- This allows custom handling (e.g., rejecting anonymous access entirely)

## CORS Handling

CORS is handled at three levels with the following priority:

1. **Global Fallback** - If `SERVER_ORIGIN` is set:
   - `*` allows any origin
   - Specific URL allows only that origin

2. **Per-API Allowlist** - From API configuration:
   - `cors` module `urls` array
   - API `domains` from meta schema

3. **Localhost Exception** - Always allowed:
   - Any origin with `localhost` domain (any port)

### CORS Module Configuration

Configure allowed origins per-API via the `cors` module in `meta_public.api_modules`:

```sql
INSERT INTO meta_public.api_modules (database_id, api_id, name, data)
VALUES (
  'db-uuid',
  'api-uuid',
  'cors',
  '{"urls": ["https://app.example.com", "https://www.example.com"]}'
);
```

## API Modules

API modules extend functionality per-API. Configure via `meta_public.api_modules`.

### Available Modules

| Module | Purpose | Data Schema |
|--------|---------|-------------|
| `cors` | CORS origin allowlist | `{ urls: string[] }` |
| `pubkey_challenge` | Public key authentication | `{ privateKey, publicKey }` |

Custom modules can also be added with arbitrary `name` and `data` fields.

### Public Key Challenge Module

When the `pubkey_challenge` module is configured, the following GraphQL mutations are added:

| Mutation | Description |
|----------|-------------|
| `getMessageForSigning` | Get a challenge message to sign with private key |
| `verifyMessageForSigning` | Verify a signed message and authenticate |
| `createUserAccountWithPublicKey` | Create a new user account with public key auth |

**Configuration:**
```sql
INSERT INTO meta_public.api_modules (database_id, api_id, name, data)
VALUES (
  'db-uuid',
  'api-uuid',
  'pubkey_challenge',
  '{"privateKey": "-----BEGIN EC PRIVATE KEY-----...", "publicKey": "-----BEGIN PUBLIC KEY-----..."}'
);
```

### RLS Module

Configure RLS authentication via `meta_public.rls_module`:

```sql
INSERT INTO meta_public.rls_module (database_id, api_id, private_schema, authenticate, authenticate_strict)
VALUES (
  'db-uuid',
  'api-uuid',
  'auth_private',           -- Schema containing auth functions
  'authenticate',           -- Function to call with token
  'authenticate_strict'     -- Optional strict auth function
);
```

The authenticate function should return a row with `id` (token_id) and `user_id` columns.

## Caching

The server uses two-tier caching for performance:

### Cache Tiers

| Cache | Contents | Key Pattern |
|-------|----------|-------------|
| Service Cache | API metadata (dbname, schemas, roles) | `api.example.com`, `api:<db-id>:<name>` |
| Graphile Cache | PostGraphile handlers | Same as service cache |

### Cache Invalidation

**Via HTTP endpoint:**
```bash
curl -X POST https://api.example.com/flush
```

**Via database notification:**
```sql
NOTIFY "schema:update", '<database-id>';
```

The server listens for `schema:update` notifications and flushes all cached entries for the specified database ID.

## Configuration

Configuration is merged from defaults, config files, and env vars via `@constructive-io/graphql-env`. See `graphql/env/README.md` for the full list and examples.

### Database Connection

| Env var | Purpose | Default |
|---------|---------|---------|
| `PGHOST` | PostgreSQL host | `localhost` |
| `PGPORT` | PostgreSQL port | `5432` |
| `PGUSER` | PostgreSQL user | `postgres` |
| `PGPASSWORD` | PostgreSQL password | `password` |
| `PGDATABASE` | PostgreSQL database | `postgres` |

### Server

| Env var | Purpose | Default |
|---------|---------|---------|
| `SERVER_HOST` | Server bind address | `localhost` |
| `SERVER_PORT` | Server port | `3000` |
| `SERVER_TRUST_PROXY` | Trust X-Forwarded-* headers | `false` |
| `SERVER_ORIGIN` | CORS fallback origin (`*` or URL) | unset |
| `SERVER_STRICT_AUTH` | Require Bearer token for all requests | `false` |

### API Routing

| Env var | Purpose | Default |
|---------|---------|---------|
| `API_ENABLE_META` | Enable meta API routing | `true` |
| `API_IS_PUBLIC` | Serve public APIs only | `true` |
| `API_EXPOSED_SCHEMAS` | Schemas when meta routing is disabled | empty |
| `API_META_SCHEMAS` | Meta schemas to query | `collections_public,meta_public` |
| `API_ANON_ROLE` | Anonymous role name | `administrator` |
| `API_ROLE_NAME` | Authenticated role name | `administrator` |
| `API_DEFAULT_DATABASE_ID` | Default database ID | `hard-coded` |

### GraphQL Features

| Env var | Purpose | Default |
|---------|---------|---------|
| `GRAPHILE_SCHEMA` | Comma-separated schemas to expose | empty |
| `FEATURES_SIMPLE_INFLECTION` | Enable simple inflection | `true` |
| `FEATURES_OPPOSITE_BASE_NAMES` | Enable opposite base names | `true` |
| `FEATURES_POSTGIS` | Enable PostGIS support | `true` |

## Testing

Use `supertest` or your HTTP client of choice against `/graphql`.

### Basic Request

```ts
import request from 'supertest';

const res = await request(server)
  .post('/graphql')
  .set('Host', 'api.example.com')
  .send({ query: '{ __typename }' });

expect(res.body.data.__typename).toBe('Query');
```

### Authenticated Request

```ts
const res = await request(server)
  .post('/graphql')
  .set('Host', 'api.example.com')
  .set('Authorization', 'Bearer <token>')
  .send({ query: '{ currentUser { id } }' });
```

### Testing JWT Claims

Expose `current_setting` in your schema to verify claims:

```sql
CREATE FUNCTION app_public.current_setting(name text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting(name, true)
$$;
```

```ts
const res = await request(server)
  .post('/graphql')
  .set('Authorization', 'Bearer <token>')
  .send({
    query: `{
      userId: currentSetting(name: "jwt.claims.user_id")
      databaseId: currentSetting(name: "jwt.claims.database_id")
    }`
  });
```

## Usage with Codegen

To generate TypeScript types from this server's schema using `@constructive-io/graphql-codegen`:

1. Start the server:
   ```bash
   PORT=5555 API_ENABLE_META=true PGDATABASE=launchql pnpm dev
   ```

2. Run codegen against the endpoint:
   ```bash
   # From the codegen package
   pnpm codegen --endpoint http://localhost:5555/graphql
   ```

See `@constructive-io/graphql-codegen` for more details.

## Server Class API

The `Server` class provides methods for managing the GraphQL server lifecycle.

### Constructor

```ts
const server = new Server(options: ConstructiveOptions);
```

### Instance Methods

| Method | Description |
|--------|-------------|
| `listen()` | Start the HTTP server, returns `http.Server` |
| `addEventListener()` | Set up database notification listeners for cache invalidation |
| `flush(databaseId: string)` | Manually flush cache for a specific database |
| `getPool()` | Get the underlying PostgreSQL connection pool |
| `close(opts?)` | Gracefully close the server and optionally caches |

### Static Methods

| Method | Description |
|--------|-------------|
| `Server.closeCaches()` | Close all shared caches (service cache + graphile cache) |

### Example: Graceful Shutdown

```ts
import { Server } from '@constructive-io/graphql-server';

const server = new Server(options);
const httpServer = server.listen();

process.on('SIGTERM', async () => {
  await server.close({ closeCaches: true });
  httpServer.close();
});
```

## Schema Utilities

The package exports utilities for building GraphQL schemas without running the full server.

### buildSchemaSDL

Build a GraphQL schema SDL directly from PostgreSQL:

```ts
import { buildSchemaSDL } from '@constructive-io/graphql-server';

const sdl = await buildSchemaSDL({
  database: 'my_database',
  schemas: ['app_public', 'users_public']
});

console.log(sdl); // GraphQL SDL string
```

### fetchEndpointSchemaSDL

Fetch a GraphQL schema via HTTP introspection from a running endpoint:

```ts
import { fetchEndpointSchemaSDL } from '@constructive-io/graphql-server';

const sdl = await fetchEndpointSchemaSDL('http://localhost:3000/graphql');

console.log(sdl); // GraphQL SDL string
```

These utilities are useful for:
- Schema diffing and validation
- Generating types without running a server
- CI/CD pipelines that need schema access

## Related Packages

| Package | Description |
|---------|-------------|
| `@constructive-io/graphql-env` | Env parsing + defaults for GraphQL |
| `@constructive-io/graphql-types` | Shared types and defaults |
| `graphile-settings` | PostGraphile configuration |
| `graphile-meta-schema` | Meta schema support |
| `pg-cache` | PostgreSQL connection pooling |
| `@constructive-io/url-domains` | Domain/subdomain parsing |
