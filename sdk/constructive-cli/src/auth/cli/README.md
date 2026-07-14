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
| `audit-log-auth` | auditLogAuth CRUD operations |
| `crypto-address` | cryptoAddress CRUD operations |
| `email` | email CRUD operations |
| `identity-provider` | identityProvider CRUD operations |
| `org-api-key-list` | orgApiKeyList CRUD operations |
| `phone-number` | phoneNumber CRUD operations |
| `principal` | principal CRUD operations |
| `principal-entity` | principalEntity CRUD operations |
| `principal-scope-override` | principalScopeOverride CRUD operations |
| `role-type` | roleType CRUD operations |
| `user-connected-account` | userConnectedAccount CRUD operations |
| `user` | user CRUD operations |
| `webauthn-credential` | webauthnCredential CRUD operations |
| `current-ip-address` | currentIpAddress |
| `current-user` | currentUser |
| `current-user-agent` | currentUserAgent |
| `current-user-id` | currentUserId |
| `require-step-up` | requireStepUp |
| `check-password` | checkPassword |
| `confirm-delete-account` | confirmDeleteAccount |
| `create-api-key` | createApiKey |
| `create-org-api-key` | createOrgApiKey |
| `create-org-principal` | createOrgPrincipal |
| `delete-org-principal` | deleteOrgPrincipal |
| `delete-principal` | deletePrincipal |
| `disconnect-account` | disconnectAccount |
| `extend-token-expires` | extendTokenExpires |
| `forgot-password` | forgotPassword |
| `link-identity` | linkIdentity |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `provision-new-user` | provisionNewUser |
| `request-cross-origin-token` | requestCrossOriginToken |
| `reset-password` | resetPassword |
| `revoke-api-key` | revokeApiKey |
| `revoke-org-api-key` | revokeOrgApiKey |
| `revoke-session` | revokeSession |
| `send-account-deletion-email` | sendAccountDeletionEmail |
| `send-verification-email` | sendVerificationEmail |
| `set-password` | setPassword |
| `sign-in` | signIn |
| `sign-in-cross-origin` | signInCrossOrigin |
| `sign-in-sms-otp` | signInSmsOtp |
| `sign-out` | signOut |
| `sign-up` | signUp |
| `sign-up-sms` | signUpSms |
| `verify-email` | verifyEmail |
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

### `audit-log-auth`

CRUD operations for AuditLogAuth records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all auditLogAuth records |
| `find-first` | Find first matching auditLogAuth record |
| `get` | Get a auditLogAuth by id |
| `create` | Create a new auditLogAuth |
| `update` | Update an existing auditLogAuth |
| `delete` | Delete a auditLogAuth |

**Fields:**

| Field | Type |
|-------|------|
| `actorId` | UUID |
| `createdAt` | Datetime |
| `event` | String |
| `id` | UUID |
| `ipAddress` | InternetAddress |
| `origin` | Origin |
| `success` | Boolean |
| `userAgent` | String |

**Required create fields:** `event`, `success`
**Optional create fields (backend defaults):** `actorId`, `ipAddress`, `origin`, `userAgent`

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
| `address` | String |
| `createdAt` | Datetime |
| `id` | UUID |
| `isPrimary` | Boolean |
| `isVerified` | Boolean |
| `name` | String |
| `ownerId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `address`
**Optional create fields (backend defaults):** `isPrimary`, `isVerified`, `name`, `ownerId`

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
| `createdAt` | Datetime |
| `email` | Email |
| `id` | UUID |
| `isPrimary` | Boolean |
| `isVerified` | Boolean |
| `name` | String |
| `ownerId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `email`
**Optional create fields (backend defaults):** `isPrimary`, `isVerified`, `name`, `ownerId`

### `identity-provider`

CRUD operations for IdentityProvider records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all identityProvider records |
| `find-first` | Find first matching identityProvider record |
| `get` | Get a identityProvider by id |
| `create` | Create a new identityProvider |
| `update` | Update an existing identityProvider |
| `delete` | Delete a identityProvider |

**Fields:**

| Field | Type |
|-------|------|
| `displayName` | String |
| `enabled` | Boolean |
| `kind` | String |
| `slug` | String |

**Optional create fields (backend defaults):** `displayName`, `enabled`, `kind`, `slug`

### `org-api-key-list`

CRUD operations for OrgApiKeyList records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all orgApiKeyList records |
| `find-first` | Find first matching orgApiKeyList record |
| `get` | Get a orgApiKeyList by id |
| `create` | Create a new orgApiKeyList |
| `update` | Update an existing orgApiKeyList |
| `delete` | Delete a orgApiKeyList |

**Fields:**

| Field | Type |
|-------|------|
| `accessLevel` | String |
| `createdAt` | Datetime |
| `expiresAt` | Datetime |
| `id` | UUID |
| `keyId` | String |
| `lastUsedAt` | Datetime |
| `mfaLevel` | String |
| `name` | String |
| `orgId` | UUID |
| `principalId` | UUID |
| `revokedAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `accessLevel`, `expiresAt`, `keyId`, `lastUsedAt`, `mfaLevel`, `name`, `orgId`, `principalId`, `revokedAt`

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
| `cc` | String |
| `createdAt` | Datetime |
| `id` | UUID |
| `isPrimary` | Boolean |
| `isVerified` | Boolean |
| `name` | String |
| `number` | String |
| `ownerId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `cc`, `number`
**Optional create fields (backend defaults):** `isPrimary`, `isVerified`, `name`, `ownerId`

### `principal`

CRUD operations for Principal records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all principal records |
| `find-first` | Find first matching principal record |
| `get` | Get a principal by principalId |
| `create` | Create a new principal |
| `update` | Update an existing principal |
| `delete` | Delete a principal |

**Fields:**

| Field | Type |
|-------|------|
| `bypassStepUp` | Boolean |
| `createdAt` | Datetime |
| `id` | UUID |
| `isReadOnly` | Boolean |
| `name` | String |
| `ownerId` | UUID |
| `updatedAt` | Datetime |
| `useAdminOwner` | Boolean |
| `userId` | UUID |

**Required create fields:** `bypassStepUp`, `id`, `isReadOnly`, `name`, `ownerId`, `useAdminOwner`, `userId`

### `principal-entity`

CRUD operations for PrincipalEntity records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all principalEntity records |
| `find-first` | Find first matching principalEntity record |
| `get` | Get a principalEntity by id |
| `create` | Create a new principalEntity |
| `update` | Update an existing principalEntity |
| `delete` | Delete a principalEntity |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `entityId` | UUID |
| `id` | UUID |
| `ownerId` | UUID |
| `principalId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `entityId`, `ownerId`, `principalId`

### `principal-scope-override`

CRUD operations for PrincipalScopeOverride records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all principalScopeOverride records |
| `find-first` | Find first matching principalScopeOverride record |
| `get` | Get a principalScopeOverride by id |
| `create` | Create a new principalScopeOverride |
| `update` | Update an existing principalScopeOverride |
| `delete` | Delete a principalScopeOverride |

**Fields:**

| Field | Type |
|-------|------|
| `allowedMask` | BitString |
| `createdAt` | Datetime |
| `id` | UUID |
| `isActive` | Boolean |
| `isReadOnly` | Boolean |
| `membershipType` | Int |
| `principalId` | UUID |
| `updatedAt` | Datetime |
| `useAdminOwner` | Boolean |

**Required create fields:** `allowedMask`, `isActive`, `isReadOnly`, `membershipType`, `principalId`, `useAdminOwner`

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

### `user-connected-account`

CRUD operations for UserConnectedAccount records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all userConnectedAccount records |
| `find-first` | Find first matching userConnectedAccount record |
| `get` | Get a userConnectedAccount by id |
| `create` | Create a new userConnectedAccount |
| `update` | Update an existing userConnectedAccount |
| `delete` | Delete a userConnectedAccount |

**Fields:**

| Field | Type |
|-------|------|
| `createdAt` | Datetime |
| `details` | JSON |
| `id` | UUID |
| `identifier` | String |
| `isVerified` | Boolean |
| `ownerId` | UUID |
| `service` | String |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `details`, `identifier`, `isVerified`, `ownerId`, `service`

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
| `createdAt` | Datetime |
| `displayName` | String |
| `displayNameTrgmSimilarity` | Float |
| `id` | UUID |
| `profilePicture` | Image |
| `searchScore` | Float |
| `searchTsv` | FullText |
| `searchTsvRank` | Float |
| `type` | Int |
| `updatedAt` | Datetime |
| `username` | String |

**Optional create fields (backend defaults):** `displayName`, `profilePicture`, `type`, `username`
> **Unified Search API fields:** `displayNameTrgmSimilarity`, `searchScore`, `searchTsv`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

**Search Examples:**

*Fuzzy search via trigram similarity (`trgmDisplayName`):*
```bash
csdk user list --where.trgmDisplayName.value "approximate query" --where.trgmDisplayName.threshold 0.3 --select title,displayNameTrgmSimilarity
```

*Full-text search via tsvector (`searchTsv`):*
```bash
csdk user list --where.searchTsv "search query" --select title,tsvRank
```

*Composite search (unifiedSearch dispatches to all text adapters):*
```bash
csdk user list --where.unifiedSearch "search query" --select title,displayNameTrgmSimilarity,searchScore,tsvRank
```

*Search with pagination and field projection:*
```bash
csdk user list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk user search "query" --limit 10 --select id,title,searchScore
```


### `webauthn-credential`

CRUD operations for WebauthnCredential records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all webauthnCredential records |
| `find-first` | Find first matching webauthnCredential record |
| `get` | Get a webauthnCredential by id |
| `create` | Create a new webauthnCredential |
| `update` | Update an existing webauthnCredential |
| `delete` | Delete a webauthnCredential |

**Fields:**

| Field | Type |
|-------|------|
| `backupEligible` | Boolean |
| `backupState` | Boolean |
| `createdAt` | Datetime |
| `credentialDeviceType` | String |
| `credentialId` | String |
| `id` | UUID |
| `lastUsedAt` | Datetime |
| `name` | String |
| `ownerId` | UUID |
| `publicKey` | Base64EncodedBinary |
| `signCount` | BigInt |
| `transports` | String |
| `updatedAt` | Datetime |
| `webauthnUserId` | String |

**Required create fields:** `credentialDeviceType`, `credentialId`, `publicKey`, `webauthnUserId`
**Optional create fields (backend defaults):** `backupEligible`, `backupState`, `lastUsedAt`, `name`, `ownerId`, `signCount`, `transports`

## Custom Operations

### `current-ip-address`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `current-user`

currentUser

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

### `require-step-up`

requireStepUp

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--stepUpType` | String |

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
  | `--input.token` | String |
  | `--input.userId` | UUID |

### `create-api-key`

createApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.accessLevel` | String |
  | `--input.clientMutationId` | String |
  | `--input.expiresIn` | IntervalInput |
  | `--input.keyName` | String |
  | `--input.mfaLevel` | String |
  | `--input.principalId` | UUID |

### `create-org-api-key`

createOrgApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.accessLevel` | String |
  | `--input.clientMutationId` | String |
  | `--input.expiresIn` | IntervalInput |
  | `--input.keyName` | String |
  | `--input.mfaLevel` | String |
  | `--input.orgId` | UUID |
  | `--input.principalId` | UUID |

### `create-org-principal`

createOrgPrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.bypassStepUp` | Boolean |
  | `--input.clientMutationId` | String |
  | `--input.isReadOnly` | Boolean |
  | `--input.name` | String |
  | `--input.orgId` | UUID |
  | `--input.useAdminOwner` | Boolean |

### `delete-org-principal`

deleteOrgPrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.principalId` | UUID |

### `delete-principal`

deletePrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.principalId` | UUID |

### `disconnect-account`

disconnectAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.accountId` | UUID (required) |
  | `--input.clientMutationId` | String |

### `extend-token-expires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.amount` | IntervalInput |
  | `--input.clientMutationId` | String |

### `forgot-password`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | Email |

### `link-identity`

linkIdentity

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.details` | JSON |
  | `--input.identifier` | String (required) |
  | `--input.service` | String (required) |

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

### `provision-new-user`

provisionNewUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |

### `request-cross-origin-token`

requestCrossOriginToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.origin` | Origin |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |

### `reset-password`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.newPassword` | String |
  | `--input.resetToken` | String |
  | `--input.roleId` | UUID |

### `revoke-api-key`

revokeApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.keyId` | UUID (required) |

### `revoke-org-api-key`

revokeOrgApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.keyId` | UUID (required) |
  | `--input.orgId` | UUID (required) |

### `revoke-session`

revokeSession

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sessionId` | UUID (required) |

### `send-account-deletion-email`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |

### `send-verification-email`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | Email |

### `set-password`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.currentPassword` | String |
  | `--input.newPassword` | String |

### `sign-in`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.credentialKind` | String |
  | `--input.csrfToken` | String |
  | `--input.deviceToken` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |

### `sign-in-cross-origin`

signInCrossOrigin

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.credentialKind` | String |
  | `--input.token` | String |

### `sign-in-sms-otp`

signInSmsOtp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.code` | String |
  | `--input.credentialKind` | String |
  | `--input.deviceToken` | String |
  | `--input.phone` | String |
  | `--input.rememberMe` | Boolean |

### `sign-out`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |

### `sign-up`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.credentialKind` | String |
  | `--input.csrfToken` | String |
  | `--input.deviceToken` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.rememberMe` | Boolean |

### `sign-up-sms`

signUpSms

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.code` | String |
  | `--input.credentialKind` | String |
  | `--input.deviceToken` | String |
  | `--input.phone` | String |
  | `--input.rememberMe` | Boolean |

### `verify-email`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.emailId` | UUID |
  | `--input.token` | String |

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
