# graphile-schema

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/graphile-schema">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-schema%2Fpackage.json"/>
  </a>
</p>

Lightweight GraphQL SDL builder for PostgreSQL using PostGraphile v5. Build schemas directly from a database or fetch them from a running GraphQL endpoint — no server dependencies required.

## Installation

```bash
npm install graphile-schema
```

## Usage

### Build SDL from a PostgreSQL Database

```typescript
import { buildSchemaSDL } from 'graphile-schema';

const sdl = await buildSchemaSDL({
  database: 'mydb',
  schemas: ['app_public'],
});

console.log(sdl);
```

### Fetch SDL from a GraphQL Endpoint

```typescript
import { fetchEndpointSchemaSDL } from 'graphile-schema';

const sdl = await fetchEndpointSchemaSDL('https://api.example.com/graphql', {
  auth: 'Bearer my-token',
  headers: { 'X-Custom-Header': 'value' },
});

console.log(sdl);
```

### With Custom Graphile Presets

```typescript
import { buildSchemaSDL } from 'graphile-schema';

const sdl = await buildSchemaSDL({
  database: 'mydb',
  schemas: ['app_public', 'app_private'],
  graphile: {
    extends: [MyCustomPreset],
    schema: { pgSimplifyPatch: false },
  },
});
```

## API

### `buildSchemaSDL(opts)`

Builds a GraphQL SDL string directly from a PostgreSQL database using PostGraphile v5 introspection.

| Option | Type | Description |
|--------|------|-------------|
| `database` | `string` | Database name (default: `'constructive'`) |
| `schemas` | `string[]` | PostgreSQL schemas to introspect |
| `graphile` | `Partial<GraphileConfig.Preset>` | Optional Graphile preset overrides |

### `fetchEndpointSchemaSDL(endpoint, opts?)`

Fetches a GraphQL SDL string from a running GraphQL endpoint via introspection query.

| Option | Type | Description |
|--------|------|-------------|
| `endpoint` | `string` | GraphQL endpoint URL |
| `opts.headerHost` | `string` | Override the `Host` header |
| `opts.auth` | `string` | `Authorization` header value |
| `opts.headers` | `Record<string, string>` | Additional request headers |

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
