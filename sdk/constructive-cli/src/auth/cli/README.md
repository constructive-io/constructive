# app CLI

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```bash
# Create a context pointing at your GraphQL endpoint
app context create production --endpoint https://api.example.com/graphql

# Set the active context
app context use production

# Authenticate
app auth set-token <your-token>
```

## Commands

| Command | Description |
|---------|-------------|
| `context` | Manage API contexts (endpoints) |
| `auth` | Manage authentication tokens |
| `role-type` | roleType CRUD operations |
| `crypto-address` | cryptoAddress CRUD operations |
| `phone-number` | phoneNumber CRUD operations |
| `connected-account` | connectedAccount CRUD operations |
| `audit-log` | auditLog CRUD operations |
| `email` | email CRUD operations |
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

Configuration is stored at `~/.app/config/`.

### `auth`

Manage authentication tokens per context.

| Subcommand | Description |
|------------|-------------|
| `set-token <token>` | Store bearer token for current context |
| `status` | Show auth status across all contexts |
| `logout` | Remove credentials for current context |

## Table Commands

### `role-type`

CRUD operations for RoleType records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all roleType records |
| `get` | Get a roleType by id |
| `create` | Create a new roleType |
| `update` | Update an existing roleType |
| `delete` | Delete a roleType |

**Fields:**

| Field | Type |
|-------|------|
| `id` | Int |
| `name` | String |

**Create fields:** `name`

### `crypto-address`

CRUD operations for CryptoAddress records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all cryptoAddress records |
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

**Create fields:** `ownerId`, `address`, `isVerified`, `isPrimary`

### `phone-number`

CRUD operations for PhoneNumber records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all phoneNumber records |
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

**Create fields:** `ownerId`, `cc`, `number`, `isVerified`, `isPrimary`

### `connected-account`

CRUD operations for ConnectedAccount records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all connectedAccount records |
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

**Create fields:** `ownerId`, `service`, `identifier`, `details`, `isVerified`

### `audit-log`

CRUD operations for AuditLog records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all auditLog records |
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
| `origin` | ConstructiveInternalTypeOrigin |
| `userAgent` | String |
| `ipAddress` | InternetAddress |
| `success` | Boolean |
| `createdAt` | Datetime |

**Create fields:** `event`, `actorId`, `origin`, `userAgent`, `ipAddress`, `success`

### `email`

CRUD operations for Email records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all email records |
| `get` | Get a email by id |
| `create` | Create a new email |
| `update` | Update an existing email |
| `delete` | Delete a email |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `ownerId` | UUID |
| `email` | ConstructiveInternalTypeEmail |
| `isVerified` | Boolean |
| `isPrimary` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Create fields:** `ownerId`, `email`, `isVerified`, `isPrimary`

### `user`

CRUD operations for User records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all user records |
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
| `profilePicture` | ConstructiveInternalTypeImage |
| `searchTsv` | FullText |
| `type` | Int |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `searchTsvRank` | Float |

**Create fields:** `username`, `displayName`, `profilePicture`, `searchTsv`, `type`, `searchTsvRank`

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
  | `input` | SignOutInput (required) |

### `send-account-deletion-email`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

### `check-password`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

### `confirm-delete-account`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

### `set-password`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPasswordInput (required) |

### `verify-email`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyEmailInput (required) |

### `reset-password`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

### `sign-in-one-time-token`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInOneTimeTokenInput (required) |

### `sign-in`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

### `sign-up`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

### `one-time-token`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OneTimeTokenInput (required) |

### `extend-token-expires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

### `forgot-password`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

### `send-verification-email`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

### `verify-password`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyPasswordInput (required) |

### `verify-totp`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyTotpInput (required) |

## Output

All commands output JSON to stdout. Pipe to `jq` for formatting:

```bash
app car list | jq '.[]'
app car get --id <uuid> | jq '.'
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
