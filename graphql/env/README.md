# @constructive-io/graphql-env

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

- Use `@constructive-io/graphql-env` for Constructive applications that need GraphQL/Graphile configuration
- Use `@pgpmjs/env` for pure PGPM tooling that doesn't need GraphQL support
