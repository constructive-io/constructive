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

Configuration types for the Constructive framework.

This package contains the upper-level `ConstructiveOptions` model used by Constructive servers, explorers, jobs, storage, email, and related packages. `ConstructiveOptions` extends the lower-level `PgpmOptions` model, so one resolved object contains both PostgreSQL/PGPM configuration and Constructive application configuration.

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
  constructiveDefaults,
} from '@constructive-io/graphql-types';

// ConstructiveOptions extends PgpmOptions with GraphQL configuration
const config: ConstructiveOptions = {
  graphile: {
    schema: ['public', 'app_public'],
    appendPlugins: [],
  },
  api: {
    enableServicesApi: true,
    exposedSchemas: ['public'],
  },
  features: {
    simpleInflection: true,
    postgis: true,
  },
  server: {
    port: 4000,
  },
};
```

## Types

### ConstructiveOptions

Full configuration options for the Constructive framework. It extends `PgpmOptions` and owns GraphQL/Graphile configuration plus the server, CDN/storage, jobs, and SMTP sections moved out of PGPM.

### Environment ownership types

This package owns the following types and their defaults:

- `ServerOptions`
- `BucketProvider` and `CDNOptions`
- jobs worker, scheduler, gateway, operation DTOs, and `JobsConfig`
- `SmtpOptions`

The lower-level `@pgpmjs/types` package continues to own PostgreSQL connections, test database settings, workspace/package configuration, deployment, migrations, and PGPM error output.

### GraphileOptions

PostGraphile/Graphile configuration including schema, plugins, and build options.

### ApiOptions

Configuration for the Constructive API including meta API settings, exposed schemas, and role configuration.

### GraphileFeatureOptions

Feature flags for GraphQL/Graphile including inflection settings and PostGIS support.

## Scope

This ownership change is intentionally limited to server, CDN/storage, jobs, and SMTP configuration. Moving `getNodeEnv()` belongs to `@constructive-io/graphql-env`; consolidating Mailgun, function-specific, Knative, LLM, observability, CAPTCHA, Graphile runtime, and test-only environment models remains follow-up work.
