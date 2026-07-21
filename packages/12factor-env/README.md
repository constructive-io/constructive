# 12factor-env

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
  <a href="https://www.npmjs.com/package/12factor-env">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2F12factor-env%2Fpackage.json"/>
  </a>
</p>

> Environment variable validation for 12-factor apps

A TypeScript library for validating environment variables. Built on top of [envalid](https://github.com/af/envalid).

## Installation

```bash
npm install 12factor-env
```

## Usage

```ts
import { env, str, num, bool, port, email, host } from '12factor-env';

const config = env(
  process.env,
  {
    // Required environment variables
    DATABASE_URL: str(),
    API_KEY: str()
  },
  {
    // Optional environment variables with defaults
    PORT: port({ default: 3000 }),
    DEBUG: bool({ default: false }),
    LOG_LEVEL: str({ default: 'info' })
  }
);

console.log(config.DATABASE_URL); // Validated string
console.log(config.PORT);         // Validated number
```

## Fallback classes: `withDefault` / `devDefault` / `required`

The real question for any config value is not "optional vs required" but
**"is there an honest fallback?"**. These thin wrappers over any envalid
validator make that intent explicit at the declaration site:

```ts
import { env, str, url, withDefault, devDefault, required } from '12factor-env';

const config = env(process.env, {}, {
  // Class 1 — honest fallback in every environment (ports, timeouts, flags)
  JOBS_SCHEMA:              withDefault(str, 'app_jobs'),

  // Class 2 — fallback in dev/test, but REQUIRED (throws) in production.
  // A localhost base domain is fine locally, a bug in prod.
  SYNC_GATEWAY_BASE_DOMAIN: devDefault(str, 'sync.localhost'),

  // Class 3 — no honest fallback; throws in every environment when absent.
  K8S_API_URL:             required(url)
});
```

| Wrapper | unset in dev/test | unset in production | env value present |
|---------|-------------------|---------------------|-------------------|
| `withDefault(v, x)` | uses `x` | uses `x` | uses env value |
| `devDefault(v, x)`  | uses `x` | **throws** | uses env value |
| `required(v)`       | **throws** | **throws** | uses env value |

### House `NODE_ENV` semantics

`devDefault` is enforced in production. Crucially, envalid natively treats an
**unset** `NODE_ENV` as production — which would make `devDefault` throw during
ordinary local development where nobody sets `NODE_ENV`. This library normalizes
`NODE_ENV` first (without mutating the caller's environment) so:

- explicit `production` → `production`
- explicit `test`/`testing`, or `GITHUB_ACTIONS=true` → `test`
- anything else, **including unset** → `development`

The same logic is exported as helpers:

```ts
import { getNodeEnv, isProduction, isTest, isDevelopment } from '12factor-env';

getNodeEnv();        // 'development' | 'production' | 'test'
isProduction();      // boolean
```

### Lenient coercion

Envalid's built-in `bool` rejects values like `TRUE` or `yes`. `boolish` accepts
`true`/`1`/`yes` case-insensitively (and is safe to combine with a boolean
default). The underlying coercion helpers are also exported:

```ts
import { env, boolish, withDefault, parseEnvBoolean, parseEnvNumber } from '12factor-env';

const config = env(process.env, {}, {
  FEATURE_ENABLED: withDefault(boolish, false)   // accepts TRUE/yes/1
});

parseEnvBoolean('YES'); // true
parseEnvNumber('42');   // 42
```

## Validators

All validators from [envalid](https://github.com/af/envalid) are re-exported:

| Validator | Description |
|-----------|-------------|
| `str()` | String value |
| `bool()` | Boolean (`true`, `false`, `1`, `0`) |
| `num()` | Number |
| `port()` | Port number (1-65535) |
| `host()` | Hostname or IP address |
| `url()` | Valid URL |
| `email()` | Valid email address |
| `json()` | JSON string (parsed) |

### Validator Options

All validators accept options:

```ts
import { str, num } from '12factor-env';

const config = env(process.env, {
  API_KEY: str({ desc: 'API key for external service' }),
  TIMEOUT: num({ default: 5000, desc: 'Request timeout in ms' })
});
```

## API

### `env(inputEnv, secrets, vars)`

Main function to validate environment variables.

- `inputEnv` - The environment object (usually `process.env`)
- `secrets` - Required environment variables
- `vars` - Optional environment variables

## Re-exports from envalid

The following are re-exported from envalid for convenience:

- `cleanEnv` - Low-level env cleaning function
- `makeValidator` - Create custom validators
- `EnvError` - Error class for validation errors
- `EnvMissingError` - Error class for missing required vars
- `testOnly` - Helper for test-only defaults
