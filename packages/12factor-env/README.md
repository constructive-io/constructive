# @constructive-io/12factor-env

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
  <a href="https://www.npmjs.com/package/@constructive-io/12factor-env">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2F12factor-env%2Fpackage.json"/>
  </a>
</p>

> Environment variable validation with secret file support for 12-factor apps

A TypeScript library for validating environment variables with built-in support for Docker/Kubernetes secret files. Built on top of [envalid](https://github.com/af/envalid) with additional features for reading secrets from files.

## Installation

```bash
pnpm add @constructive-io/12factor-env
```

## Usage

```ts
import { env, str, num, bool, port, email, host } from '@constructive-io/12factor-env';

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

## Secret File Support

This library supports reading secrets from files, which is useful for Docker secrets and Kubernetes secrets that are mounted as files.

### Direct Secret Files

Secrets can be read from `/run/secrets/` (or a custom path via `ENV_SECRETS_PATH`):

```ts
import { env, str } from '@constructive-io/12factor-env';

// If /run/secrets/DATABASE_PASSWORD exists, it will be read automatically
const config = env(process.env, {
  DATABASE_PASSWORD: str()
});
```

### _FILE Suffix Pattern

You can also use the `_FILE` suffix pattern commonly used with Docker:

```bash
# Set the path to the secret file
export DATABASE_PASSWORD_FILE=/run/secrets/db-password
```

```ts
import { env, str } from '@constructive-io/12factor-env';

// Will read from the file specified in DATABASE_PASSWORD_FILE
const config = env(process.env, {
  DATABASE_PASSWORD: str()
});
```

### Custom Secrets Path

Set `ENV_SECRETS_PATH` to change the default secrets directory:

```bash
export ENV_SECRETS_PATH=/custom/secrets/path
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
import { str, num } from '@constructive-io/12factor-env';

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

### `secret(envFile)`

Create a validator for a secret file:

```ts
import { env, secret } from '@constructive-io/12factor-env';

const config = env(process.env, {
  DB_PASSWORD: secret('DATABASE_PASSWORD')
});
```

### `getSecret(name)`

Read a secret from a file:

```ts
import { getSecret } from '@constructive-io/12factor-env';

const password = getSecret('DATABASE_PASSWORD');
```

### `secretPath(name)`

Resolve the full path to a secret file:

```ts
import { secretPath } from '@constructive-io/12factor-env';

const path = secretPath('DATABASE_PASSWORD');
// Returns: /run/secrets/DATABASE_PASSWORD
```

## Re-exports from envalid

The following are re-exported from envalid for convenience:

- `cleanEnv` - Low-level env cleaning function
- `makeValidator` - Create custom validators
- `EnvError` - Error class for validation errors
- `EnvMissingError` - Error class for missing required vars
- `testOnly` - Helper for test-only defaults
