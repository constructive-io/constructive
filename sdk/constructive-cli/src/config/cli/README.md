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
| `platform-config-definition` | platformConfigDefinition CRUD operations |
| `platform-config` | platformConfig CRUD operations |
| `platform-secrets-del` | platformSecretsDel |
| `org-secrets-del` | orgSecretsDel |
| `platform-secrets-remove-array` | platformSecretsRemoveArray |
| `org-secrets-remove-array` | orgSecretsRemoveArray |
| `platform-secrets-rotate` | platformSecretsRotate |
| `platform-secrets-set` | platformSecretsSet |
| `org-secrets-rotate` | orgSecretsRotate |
| `org-secrets-set` | orgSecretsSet |
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

### `platform-config-definition`

CRUD operations for PlatformConfigDefinition records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all platformConfigDefinition records |
| `find-first` | Find first matching platformConfigDefinition record |
| `get` | Get a platformConfigDefinition by id |
| `create` | Create a new platformConfigDefinition |
| `update` | Update an existing platformConfigDefinition |
| `delete` | Delete a platformConfigDefinition |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `name` | String |
| `description` | String |
| `defaultValue` | String |
| `isBuiltIn` | Boolean |
| `labels` | JSON |
| `annotations` | JSON |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `description`, `defaultValue`, `isBuiltIn`, `labels`, `annotations`

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
| `id` | UUID |
| `namespaceId` | UUID |
| `name` | String |
| `value` | String |
| `labels` | JSON |
| `annotations` | JSON |
| `description` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `expiresAt` | Datetime |

**Required create fields:** `namespaceId`, `name`
**Optional create fields (backend defaults):** `value`, `labels`, `annotations`, `description`, `expiresAt`

## Custom Operations

### `platform-secrets-del`

platformSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.secretName` | String |
  | `--input.namespaceId` | UUID |

### `org-secrets-del`

orgSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.ownerId` | UUID |
  | `--input.secretName` | String |
  | `--input.namespaceId` | UUID |

### `platform-secrets-remove-array`

platformSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.secretNames` | String |
  | `--input.namespaceId` | UUID |

### `org-secrets-remove-array`

orgSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.ownerId` | UUID |
  | `--input.secretNames` | String |
  | `--input.namespaceId` | UUID |

### `platform-secrets-rotate`

platformSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |
  | `--input.namespaceId` | UUID |
  | `--input.algo` | String |

### `platform-secrets-set`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |
  | `--input.secretNamespaceId` | UUID |
  | `--input.algo` | String |

### `org-secrets-rotate`

orgSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.ownerId` | UUID |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |
  | `--input.namespaceId` | UUID |
  | `--input.algo` | String |

### `org-secrets-set`

orgSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.scopeOwnerId` | UUID |
  | `--input.secretName` | String |
  | `--input.secretValue` | String |
  | `--input.secretNamespaceId` | UUID |
  | `--input.algo` | String |

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
