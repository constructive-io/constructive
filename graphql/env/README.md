# @constructive-io/graphql-env

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-env"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fenv%2Fpackage.json"/></a>
</p>

Constructive environment configuration with GraphQL/Graphile support.

This package extends `@pgpmjs/env` with GraphQL-specific environment variable parsing and defaults for Constructive applications.

## Installation

```bash
npm install @constructive-io/graphql-env
```

## Usage

```typescript
import { getEnvOptions } from '@constructive-io/graphql-env';

// Get merged options (core PGPM + GraphQL defaults + env vars + config)
const options = getEnvOptions();

// With overrides
const options = getEnvOptions({
  graphile: { schema: ['public', 'app'] },
  features: { simpleInflection: true }
});
```

## Environment Variables

In addition to all environment variables supported by `@pgpmjs/env`, this package parses:

### GraphQL Schema
- `GRAPHILE_SCHEMA` - Comma-separated list of PostgreSQL schemas to expose
- `GRAPHILE_INTROSPECTION_CLIENT_RELEASE_MODE` - `reuse` preserves the introspection backend; `destroy` retires that exact client after gather and reconnects lazily for runtime traffic; defaults to `reuse`
- `GRAPHILE_REALTIME_SCHEMA` - Exact physical schema containing realtime cursor functions; omission preserves `realtime_public`
- `GRAPHILE_REALTIME_NOTIFICATION_MODE` - `dedicated` keeps one PostGraphile subscriber per instance; `shared-exact` opts into the per-database exact-topic broker and requires an application `notificationPgResolver`; defaults to `dedicated`
- `GRAPHILE_REALTIME_NOTIFICATION_ROLE_REVALIDATION_MS` - Maximum age of a successful shared-listener role audit; defaults to `60000`
- `GRAPHILE_REALTIME_CURSOR_POLL_INTERVAL_MS` - Realtime cursor recovery poll interval; defaults to `5000`
- `GRAPHILE_REALTIME_CURSOR_HEARTBEAT_INTERVAL_MS` - Realtime cursor heartbeat interval; defaults to `30000`
- `GRAPHILE_RELEASE_BUILD_STATE_AFTER_VALIDATION` - Opt in to releasing schema-construction-only Graphile state after successful validation; defaults to `false`

### Feature Flags
- `FEATURES_SIMPLE_INFLECTION` - Enable simple inflection plugin
- `FEATURES_OPPOSITE_BASE_NAMES` - Enable opposite base names
- `FEATURES_POSTGIS` - Enable PostGIS support

### API Configuration
- `API_ROUTING_SCHEMA` - Schema containing the compiled `resolve_route()` resolver (production routing always resolves through it)
- `API_IS_PUBLIC` - Whether API is public
- `API_EXPOSED_SCHEMAS` - Comma-separated list of exposed schemas
- `API_META_SCHEMAS` - Comma-separated list of meta schemas
- `API_ALLOW_META_SCHEMA_HEADER` - Explicitly enable the privileged `X-Meta-Schema` control-plane surface. Defaults to false and must only be used on a separate private admin ingress.
- `API_ANON_ROLE` - Anonymous role name
- `API_ROLE_NAME` - Default role name
- `GRAPHQL_INTERNAL_REQUEST_SECRET` - Minimum-32-byte token required before private routing/actor headers or the HTTP cache flush endpoint are trusted. `X-Schemata` remains prohibited; use an authoritative API name.

### Routing Metadata Cache
- `GRAPHQL_ROUTING_CACHE_MAX_ENTRIES` - Capacity reserved for routing metadata diagnostics. Security-sensitive request routing is resolved authoritatively and never served from this cache.

### Runtime PostgreSQL credentials

- `GRAPHQL_RUNTIME_PGUSER` and `GRAPHQL_RUNTIME_PGPASSWORD` populate the legacy static `runtimePg` login.
- Production and `GRAPHILE_INTROSPECTION_MODE=scoped-required` do not accept those two values as a dynamic multi-tenant credential source. Use a programmatic `runtimePgResolver`; for a dedicated one-route server, pair an explicit static database with `runtimePgStaticIdentity` in trusted configuration.

## Defaults

GraphQL defaults are provided by `@constructive-io/graphql-types`:

```typescript
{
  graphile: { schema: [] },
  features: {
    simpleInflection: true,
    oppositeBaseNames: true,
    postgis: true
  },
  api: {
    exposedSchemas: [],
    anonRole: 'administrator',
    roleName: 'administrator',
    isPublic: true,
    metaSchemas: ['routing_public', 'metaschema_public', 'metaschema_modules_public'],
    allowMetaSchemaHeader: false,
    routingSchema: 'routing_public'
  },
  routingCache: {}
}
```

## When to Use

- Use `@constructive-io/graphql-env` for Constructive applications that need GraphQL/Graphile configuration
- Use `@pgpmjs/env` for pure PGPM tooling that doesn't need GraphQL support
