# @pgpmjs/env

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/env"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Fenv%2Fpackage.json"/></a>
</p>

Lower-level environment management for PostgreSQL and the PGPM toolchain. It resolves PGPM defaults, config files, environment variables, and runtime overrides without taking ownership of Constructive application configuration.

`@pgpmjs/env` owns database connections, test database settings, workspace/package configuration, deployment, migrations, and PGPM error output. HTTP server, CDN/storage, jobs, and SMTP configuration are owned by the upper-level `@constructive-io/graphql-env` resolver.

Generic string-to-value conversion is provided by `12factor-env/parsers`. PGPM env still owns which PGPM variables are read and how their parsed values map into `PgpmOptions`.

## Features

- Config file discovery using `walkUp` utility
- PostgreSQL and PGPM environment variable parsing
- Unified merge hierarchy: defaults → config → env vars → overrides
- An explicit PGPM-only result boundary
- TypeScript support with full type safety

## Usage

```typescript
import { getPgpmEnvOptions } from '@pgpmjs/env';

const options = getPgpmEnvOptions(overrides, cwd);
```

`getEnvOptions` is an exact alias of `getPgpmEnvOptions` for existing PGPM callers.

For a complete Constructive configuration, including PGPM values plus GraphQL runtime configuration, use `getConstructiveEnvOptions` from `@constructive-io/graphql-env`.

## Ownership change

This refactor moves only the existing server, CDN/storage, jobs, and SMTP configuration, plus `getNodeEnv()`, from PGPM env to GraphQL env. It does not consolidate other environment variables currently read by Mailgun providers, functions, Knative runtimes, LLM integrations, or other packages; those remain follow-up work.

The shared boolean and number parser implementations are now owned by the neutral `12factor-env` mechanism layer rather than being public PGPM utilities. This changes parser ownership without moving any additional environment variables into or out of PGPM env.
