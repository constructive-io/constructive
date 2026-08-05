# @constructive-io/graphql-types

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-types"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Ftypes%2Fpackage.json"/></a>
</p>

GraphQL/Graphile types for the Constructive framework.

This package contains TypeScript type definitions for PostGraphile/Graphile configuration used by Constructive server, explorer, and related packages.

## Installation

```bash
npm install @constructive-io/graphql-types
```

## Usage

```typescript
import { 
  ConstructiveOptions, 
  GraphileOptions, 
  ApiOptions, 
  GraphileFeatureOptions,
  constructiveDefaults 
} from '@constructive-io/graphql-types';

// ConstructiveOptions extends PgpmOptions with GraphQL configuration
const config: ConstructiveOptions = {
  graphile: {
    schema: ['public', 'app_public'],
    appendPlugins: [],
  },
  api: {
    routingSchema: 'routing_public',
    exposedSchemas: ['public'],
  },
  routingCache: {
    maxEntries: 4096,
  },
  runtimePgResolver: async (route) => ({
    database: route.databaseName,
    user: await runtimeUsers.forRoute(route),
    password: await runtimePasswords.forRoute(route),
  }),
  features: {
    simpleInflection: true,
    postgis: true,
  },
};
```

## Types

### ConstructiveOptions

Full configuration options for Constructive framework, extending `PgpmOptions` with GraphQL/Graphile configuration.

### GraphileOptions

PostGraphile/Graphile configuration including schema, plugins, and build options.

### ApiOptions

Configuration for the Constructive API including meta API settings, exposed schemas, and role configuration.

### RoutingCacheOptions

Configuration for the process-wide routing/service-label metadata cache. This
cache is independent from Graphile build identity and its `maxEntries` value
must be at least the effective resident Graphile capacity.

### RuntimePgResolver

Production multi-tenant servers resolve a least-privilege login from the exact
credential-free `RuntimePgResolverInput`: database id/name, API id, ordered
schemas, and `[anonymous, authenticated]` roles. The resolver must return an
explicit user, password, and matching database. A static `runtimePg` is accepted
in production or scoped introspection only with `runtimePgStaticIdentity`, which
binds it to one byte-exact route contract.

`runtimePgResolver` is trusted infrastructure and should look up the login by
immutable `databaseId`. Its normalized host, port, database, and TLS policy must
match the control-plane tenant connection. Multi-cluster routing requires a
future per-route resolver shared by both lanes; runtime-only endpoint divergence
fails closed.

### GraphileFeatureOptions

Feature flags for GraphQL/Graphile including inflection settings and PostGIS support.

## Re-exports

This package re-exports all types from `@pgpmjs/types` for convenience, so you can import both core PGPM types and GraphQL types from a single package.
