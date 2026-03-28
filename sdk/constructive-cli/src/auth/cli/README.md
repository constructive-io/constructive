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
| `email` | email CRUD operations |
| `phone-number` | phoneNumber CRUD operations |
| `crypto-address` | cryptoAddress CRUD operations |
| `connected-account` | connectedAccount CRUD operations |
| `audit-log` | auditLog CRUD operations |
| `role-type` | roleType CRUD operations |
| `user` | user CRUD operations |
| `current-ip-address` | currentIpAddress |
| `current-user-agent` | currentUserAgent |
| `current-user-id` | currentUserId |
| `current-user` | currentUser |
| `sign-out` | signOut |
| `send-account-deletion-email` | sendAccountDeletionEmail |
| `check-password` | checkPassword |
| `confirm-delete-account` | confirmDeleteAccount |
| `set-password` | setPassword |
| `verify-email` | verifyEmail |
| `reset-password` | resetPassword |
| `sign-in-one-time-token` | signInOneTimeToken |
| `sign-in` | signIn |
| `sign-up` | signUp |
| `one-time-token` | oneTimeToken |
| `extend-token-expires` | extendTokenExpires |
| `forgot-password` | forgotPassword |
| `send-verification-email` | sendVerificationEmail |
| `verify-password` | verifyPassword |
| `verify-totp` | verifyTotp |

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

### `email`

CRUD operations for Email records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all email records |
| `find-first` | Find first matching email record |
| `get` | Get a email by id |
| `create` | Create a new email |
| `update` | Update an existing email |
| `delete` | Delete a email |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `email` | Email |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `email`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`

### `phone-number`

CRUD operations for PhoneNumber records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all phoneNumber records |
| `find-first` | Find first matching phoneNumber record |
| `get` | Get a phoneNumber by id |
| `create` | Create a new phoneNumber |
| `update` | Update an existing phoneNumber |
| `delete` | Delete a phoneNumber |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `cc` | String |
| `number` | String |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `cc`, `number`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`

### `crypto-address`

CRUD operations for CryptoAddress records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAddress records |
| `find-first` | Find first matching cryptoAddress record |
| `get` | Get a cryptoAddress by id |
| `create` | Create a new cryptoAddress |
| `update` | Update an existing cryptoAddress |
| `delete` | Delete a cryptoAddress |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `address` | String |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `address`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`

### `connected-account`

CRUD operations for ConnectedAccount records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all connectedAccount records |
| `find-first` | Find first matching connectedAccount record |
| `get` | Get a connectedAccount by id |
| `create` | Create a new connectedAccount |
| `update` | Update an existing connectedAccount |
| `delete` | Delete a connectedAccount |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `service` | String |
| `identifier` | String |
| `details` | JSON |
| `isVerified` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `service`, `identifier`, `details`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`

### `audit-log`

CRUD operations for AuditLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all auditLog records |
| `find-first` | Find first matching auditLog record |
| `get` | Get a auditLog by id |
| `create` | Create a new auditLog |
| `update` | Update an existing auditLog |
| `delete` | Delete a auditLog |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `event` | String |
| `actorId` | UUID |
| `origin` | Origin |
| `userAgent` | String |
| `ipAddress` | InternetAddress |
| `success` | Boolean |
| `createdAt` | Datetime |

**Required create fields:** `event`, `success`
**Optional create fields (backend defaults):** `actorId`, `origin`, `userAgent`, `ipAddress`

### `role-type`

CRUD operations for RoleType records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all roleType records |
| `find-first` | Find first matching roleType record |
| `get` | Get a roleType by id |
| `create` | Create a new roleType |
| `update` | Update an existing roleType |
| `delete` | Delete a roleType |

**Fields:**

| Field | Type |
|-------|------|
| `id` | Int |
| `name` | String |

**Required create fields:** `name`

### `user`

CRUD operations for User records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all user records |
| `find-first` | Find first matching user record |
| `search <query>` | Search user records |
| `get` | Get a user by id |
| `create` | Create a new user |
| `update` | Update an existing user |
| `delete` | Delete a user |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `username` | String |
| `displayName` | String |
| `profilePicture` | Image |
| `searchTsv` | FullText |
| `type` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `searchTsvRank` | Float |
| `displayNameTrgmSimilarity` | Float |
| `searchScore` | Float |

**Optional create fields (backend defaults):** `username`, `displayName`, `profilePicture`, `type`
> **Unified Search API fields:** `searchTsv`, `displayNameTrgmSimilarity`, `searchScore`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

**Search Examples:**

*Full-text search via tsvector (`searchTsv`):*
```bash
csdk user list --where.searchTsv "search query" --select title,tsvRank
```

*Fuzzy search via trigram similarity (`trgmDisplayName`):*
```bash
csdk user list --where.trgmDisplayName.value "approximate query" --where.trgmDisplayName.threshold 0.3 --select title,displayNameTrgmSimilarity
```

*Composite search (fullTextSearch dispatches to all text adapters):*
```bash
csdk user list --where.fullTextSearch "search query" --select title,tsvRank,displayNameTrgmSimilarity,searchScore
```

*Search with pagination and field projection:*
```bash
csdk user list --where.fullTextSearch "query" --limit 10 --select id,title,searchScore
csdk user search "query" --limit 10 --select id,title,searchScore
```


## Custom Operations

### `current-ip-address`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `current-user-agent`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `current-user-id`

currentUserId

- **Type:** query
- **Arguments:** none

### `current-user`

currentUser

- **Type:** query
- **Arguments:** none

### `sign-out`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |

### `send-account-deletion-email`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |

### `check-password`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.password` | String |

### `confirm-delete-account`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.userId` | UUID |
  | `--input.token` | String |

### `set-password`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.currentPassword` | String |
  | `--input.newPassword` | String |

### `verify-email`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.emailId` | UUID |
  | `--input.token` | String |

### `reset-password`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.roleId` | UUID |
  | `--input.resetToken` | String |
  | `--input.newPassword` | String |

### `sign-in-one-time-token`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.token` | String |
  | `--input.credentialKind` | String |

### `sign-in`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |
  | `--input.credentialKind` | String |
  | `--input.csrfToken` | String |

### `sign-up`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |
  | `--input.credentialKind` | String |
  | `--input.csrfToken` | String |

### `one-time-token`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.origin` | Origin |
  | `--input.rememberMe` | Boolean |

### `extend-token-expires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.amount` | IntervalInput |

### `forgot-password`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | Email |

### `send-verification-email`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | Email |

### `verify-password`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.password` | String (required) |

### `verify-totp`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.totpValue` | String (required) |

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
