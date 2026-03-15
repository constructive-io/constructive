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

Environment management for PGPM (and Constructive) projects. Provides unified configuration resolution from defaults, config files, environment variables, and overrides.

## Features

- Config file discovery using `walkUp` utility
- Environment variable parsing
- Unified merge hierarchy: defaults → config → env vars → overrides
- TypeScript support with full type safety

## Usage

```typescript
import { getEnvOptions } from '@pgpmjs/env';

const options = getEnvOptions(overrides, cwd);
```
