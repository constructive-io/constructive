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

Upper-level environment configuration for Constructive applications.

This package calls the lower-level `@pgpmjs/env` resolver and combines its PostgreSQL/PGPM result with Constructive defaults, Constructive config-file sections, GraphQL environment variables, and runtime overrides. Callers receive one complete `ConstructiveOptions` result and do not need to combine the two resolvers manually.

## Installation

```bash
npm install @constructive-io/graphql-env
```

## Usage

```typescript
import { getConstructiveEnvOptions } from '@constructive-io/graphql-env';

// PostgreSQL/PGPM configuration and Constructive runtime configuration
const options = getConstructiveEnvOptions();

// With overrides
const overriddenOptions = getConstructiveEnvOptions({
  server: { port: 4000 },
  graphile: { schema: ['public', 'app'] },
  features: { simpleInflection: true },
});
```

`getEnvOptions` is an exact alias of `getConstructiveEnvOptions`.

## Resolution order

Configuration is merged from lowest to highest priority:

```text
PGPM and Constructive defaults
→ PGPM config and environment values
→ Constructive config values
→ Constructive environment values
→ runtime overrides
```

## Environment Variables

In addition to the PostgreSQL/PGPM values supplied by `@pgpmjs/env`, this package parses the Constructive-owned variables below.

### Server

- `PORT`
- `SERVER_HOST`
- `SERVER_TRUST_PROXY`
- `SERVER_ORIGIN`
- `SERVER_STRICT_AUTH`

### CDN and storage

- `BUCKET_PROVIDER`
- `BUCKET_NAME`
- `AWS_REGION`
- `AWS_ACCESS_KEY` / `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_KEY` / `AWS_SECRET_ACCESS_KEY`
- `CDN_ENDPOINT`
- `CDN_PUBLIC_URL_PREFIX`

### Jobs

- `JOBS_SCHEMA`
- `JOBS_SUPPORT_ANY`
- `JOBS_SUPPORTED`
- `INTERNAL_GATEWAY_URL`
- `INTERNAL_JOBS_CALLBACK_URL`
- `INTERNAL_JOBS_CALLBACK_PORT`

### SMTP

This package owns the existing `SMTP_*` configuration previously parsed by `@pgpmjs/env`.

### GraphQL Schema

- `GRAPHILE_SCHEMA` - Comma-separated list of PostgreSQL schemas to expose

### Feature Flags

- `FEATURES_SIMPLE_INFLECTION` - Enable simple inflection plugin
- `FEATURES_OPPOSITE_BASE_NAMES` - Enable opposite base names
- `FEATURES_POSTGIS` - Enable PostGIS support

### API Configuration

- `API_ENABLE_SERVICES` - Enable services API (domain/subdomain routing)
- `API_IS_PUBLIC` - Whether API is public
- `API_EXPOSED_SCHEMAS` - Comma-separated list of exposed schemas
- `API_META_SCHEMAS` - Comma-separated list of meta schemas
- `API_ANON_ROLE` - Anonymous role name
- `API_ROLE_NAME` - Default role name
- `API_DEFAULT_DATABASE_ID` - Default database ID

## Defaults

Constructive defaults are provided by `@constructive-io/graphql-types`. They include PGPM defaults, the existing GraphQL defaults, and the server/CDN/jobs/SMTP defaults moved in this refactor.

```typescript
{
  graphile: { schema: [] },
  features: {
    simpleInflection: true,
    oppositeBaseNames: true,
    postgis: true
  },
  api: {
    enableServicesApi: true,
    exposedSchemas: [],
    anonRole: 'administrator',
    roleName: 'administrator',
    defaultDatabaseId: 'hard-coded',
    isPublic: true,
    metaSchemas: ['services_public', 'metaschema_public', 'metaschema_modules_public']
  }
}
```

## When to Use

- Use `@constructive-io/graphql-env` for GraphQL servers and other Constructive applications that need the complete aggregate.
- Use `@pgpmjs/env` for pure PostgreSQL/PGPM tooling.

## Follow-up boundary

This refactor moves only server, CDN/storage, jobs, SMTP, and `getNodeEnv()` ownership out of PGPM. It does not consolidate environment variables currently managed by Mailgun providers, individual functions, Knative runtimes, LLM integrations, observability, CAPTCHA, Graphile runtime helpers, or test harnesses. Existing behavior in those areas remains unchanged and can be addressed separately.
