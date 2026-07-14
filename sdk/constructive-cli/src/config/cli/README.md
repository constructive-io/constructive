# csdk CLI

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```bash
# Create a context pointing at your GraphQL endpoint
csdk context create production --endpoint https://api.example.com/graphql

# Set the active context
csdk context use production

# Authenticate
csdk auth set-token <your-token>
```

## Commands

| Command | Description |
|---------|-------------|
| `context` | Manage API contexts (endpoints) |
| `auth` | Manage authentication tokens |
| `config` | Manage config key-value store (per-context) |
| `config` | config CRUD operations |
| `platform-config` | platformConfig CRUD operations |
| `platform-internal-secret` | platformInternalSecret CRUD operations |
| `platform-secret` | platformSecret CRUD operations |
| `secret` | secret CRUD operations |
| `secrets-del` | _secretsDel |
| `secrets-remove-array` | _secretsRemoveArray |
| `secrets-rotate` | _secretsRotate |
| `secrets-set` | _secretsSet |
| `platform-internal-secrets-del` | platformInternalSecretsDel |
| `platform-internal-secrets-remove-array` | platformInternalSecretsRemoveArray |
| `platform-internal-secrets-rotate` | platformInternalSecretsRotate |
| `platform-internal-secrets-set` | platformInternalSecretsSet |
| `platform-secrets-del` | platformSecretsDel |
| `platform-secrets-remove-array` | platformSecretsRemoveArray |
| `platform-secrets-rotate` | platformSecretsRotate |
| `platform-secrets-set` | platformSecretsSet |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Infrastructure Commands

### `context`

Manage named API contexts (kubectl-style).

| Subcommand | Description |
|------------|-------------|
| `create <name> --endpoint <url>` | Create a new context |
| `list` | List all contexts |
| `use <name>` | Set the active context |
| `current` | Show current context |
| `delete <name>` | Delete a context |

Configuration is stored at `~/.csdk/config/`.

### `auth`

Manage authentication tokens per context.

| Subcommand | Description |
|------------|-------------|
| `set-token <token>` | Store bearer token for current context |
| `status` | Show auth status across all contexts |
| `logout` | Remove credentials for current context |

### `config`

Manage per-context key-value configuration variables.

| Subcommand | Description |
|------------|-------------|
| `get <key>` | Get a config value |
| `set <key> <value>` | Set a config value |
| `list` | List all config values |
| `delete <key>` | Delete a config value |

Variables are scoped to the active context and stored at `~/.csdk/config/`.

## Table Commands

### `config`

CRUD operations for Config records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all config records |
| `find-first` | Find first matching config record |
| `get` | Get a config by id |
| `create` | Create a new config |
| `update` | Update an existing config |
| `delete` | Delete a config |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `expiresAt` | Datetime |
| `id` | UUID |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `provider` | String |
| `updatedAt` | Datetime |
| `value` | String |

**Required create fields:** `databaseId`, `name`, `namespaceId`
**Optional create fields (backend defaults):** `annotations`, `description`, `expiresAt`, `labels`, `provider`, `value`

### `platform-config`

CRUD operations for PlatformConfig records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformConfig records |
| `find-first` | Find first matching platformConfig record |
| `get` | Get a platformConfig by id |
| `create` | Create a new platformConfig |
| `update` | Update an existing platformConfig |
| `delete` | Delete a platformConfig |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `description` | String |
| `expiresAt` | Datetime |
| `id` | UUID |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `provider` | String |
| `updatedAt` | Datetime |
| `value` | String |

**Required create fields:** `name`, `namespaceId`
**Optional create fields (backend defaults):** `annotations`, `description`, `expiresAt`, `labels`, `provider`, `value`

### `platform-internal-secret`

CRUD operations for PlatformInternalSecret records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformInternalSecret records |
| `find-first` | Find first matching platformInternalSecret record |
| `get` | Get a platformInternalSecret by id |
| `create` | Create a new platformInternalSecret |
| `update` | Update an existing platformInternalSecret |
| `delete` | Delete a platformInternalSecret |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `description` | String |
| `id` | UUID |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `retiredAt` | Datetime |
| `rotatedAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `annotations`, `description`, `labels`, `name`, `namespaceId`, `retiredAt`, `rotatedAt`

### `platform-secret`

CRUD operations for PlatformSecret records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformSecret records |
| `find-first` | Find first matching platformSecret record |
| `get` | Get a platformSecret by id |
| `create` | Create a new platformSecret |
| `update` | Update an existing platformSecret |
| `delete` | Delete a platformSecret |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `description` | String |
| `id` | UUID |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `provider` | String |
| `retiredAt` | Datetime |
| `rotatedAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `annotations`, `description`, `labels`, `name`, `namespaceId`, `provider`, `retiredAt`, `rotatedAt`

### `secret`

CRUD operations for Secret records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all secret records |
| `find-first` | Find first matching secret record |
| `get` | Get a secret by id |
| `create` | Create a new secret |
| `update` | Update an existing secret |
| `delete` | Delete a secret |

**Fields:**

| Field | Type |
|-------|------|
| `annotations` | JSON |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `labels` | JSON |
| `name` | String |
| `namespaceId` | UUID |
| `provider` | String |
| `retiredAt` | Datetime |
| `rotatedAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `annotations`, `databaseId`, `description`, `labels`, `name`, `namespaceId`, `provider`, `retiredAt`, `rotatedAt`

## Custom Operations

### `secrets-del`

_secretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.namespaceId` | UUID |
  | `--input.secretName` | String |

### `secrets-remove-array`

_secretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.namespaceId` | UUID |
  | `--input.secretNames` | String |

### `secrets-rotate`

_secretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.algo` | String |
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.namespaceId` | UUID |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |

### `secrets-set`

_secretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.algo` | String |
  | `--input.clientMutationId` | String |
  | `--input.provider` | String |
  | `--input.scopeDatabaseId` | UUID |
  | `--input.secretName` | String |
  | `--input.secretNamespaceId` | UUID |
  | `--input.secretValue` | String |

### `platform-internal-secrets-del`

platformInternalSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.namespaceId` | UUID |
  | `--input.secretName` | String |

### `platform-internal-secrets-remove-array`

platformInternalSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.namespaceId` | UUID |
  | `--input.secretNames` | String |

### `platform-internal-secrets-rotate`

platformInternalSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.algo` | String |
  | `--input.clientMutationId` | String |
  | `--input.namespaceId` | UUID |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |

### `platform-internal-secrets-set`

platformInternalSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.algo` | String |
  | `--input.clientMutationId` | String |
  | `--input.secretName` | String |
  | `--input.secretNamespaceId` | UUID |
  | `--input.secretValue` | String |

### `platform-secrets-del`

platformSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.namespaceId` | UUID |
  | `--input.secretName` | String |

### `platform-secrets-remove-array`

platformSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.namespaceId` | UUID |
  | `--input.secretNames` | String |

### `platform-secrets-rotate`

platformSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.algo` | String |
  | `--input.clientMutationId` | String |
  | `--input.namespaceId` | UUID |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |

### `platform-secrets-set`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.algo` | String |
  | `--input.clientMutationId` | String |
  | `--input.provider` | String |
  | `--input.secretName` | String |
  | `--input.secretNamespaceId` | UUID |
  | `--input.secretValue` | String |

### `provision-bucket`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.bucketKey` | String (required) |
  | `--input.ownerId` | UUID |

## Output

All commands output JSON to stdout. Pipe to `jq` for formatting:

```bash
csdk car list | jq '.[]'
csdk car get --id <uuid> | jq '.'
```

## Non-Interactive Mode

Use `--no-tty` to skip all interactive prompts (useful for scripts and CI):

```bash
csdk --no-tty car create --name "Sedan" --year 2024
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
