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
| `principal` | principal CRUD operations |
| `principal-entity` | principalEntity CRUD operations |
| `principal-scope-override` | principalScopeOverride CRUD operations |
| `email` | email CRUD operations |
| `phone-number` | phoneNumber CRUD operations |
| `crypto-address` | cryptoAddress CRUD operations |
| `webauthn-credential` | webauthnCredential CRUD operations |
| `audit-log-auth` | auditLogAuth CRUD operations |
| `identity-provider` | identityProvider CRUD operations |
| `role-type` | roleType CRUD operations |
| `user-connected-account` | userConnectedAccount CRUD operations |
| `org-api-key-list` | orgApiKeyList CRUD operations |
| `user` | user CRUD operations |
| `current-user-agent` | currentUserAgent |
| `current-user-id` | currentUserId |
| `current-ip-address` | currentIpAddress |
| `require-step-up` | requireStepUp |
| `current-user` | currentUser |
| `sign-out` | signOut |
| `send-account-deletion-email` | sendAccountDeletionEmail |
| `check-password` | checkPassword |
| `delete-org-principal` | deleteOrgPrincipal |
| `delete-principal` | deletePrincipal |
| `disconnect-account` | disconnectAccount |
| `revoke-api-key` | revokeApiKey |
| `revoke-session` | revokeSession |
| `verify-password` | verifyPassword |
| `verify-totp` | verifyTotp |
| `confirm-delete-account` | confirmDeleteAccount |
| `revoke-org-api-key` | revokeOrgApiKey |
| `set-password` | setPassword |
| `verify-email` | verifyEmail |
| `provision-new-user` | provisionNewUser |
| `reset-password` | resetPassword |
| `create-org-principal` | createOrgPrincipal |
| `sign-in-cross-origin` | signInCrossOrigin |
| `sign-in-sms-otp` | signInSmsOtp |
| `sign-up-sms` | signUpSms |
| `sign-up` | signUp |
| `sign-in` | signIn |
| `link-identity` | linkIdentity |
| `extend-token-expires` | extendTokenExpires |
| `create-org-api-key` | createOrgApiKey |
| `create-api-key` | createApiKey |
| `request-cross-origin-token` | requestCrossOriginToken |
| `forgot-password` | forgotPassword |
| `send-verification-email` | sendVerificationEmail |
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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `ownerId` | UUID |
| `userId` | UUID |
| `name` | String |
| `useAdminOwner` | Boolean |
| `isReadOnly` | Boolean |
| `bypassStepUp` | Boolean |

**Required create fields:** `id`, `ownerId`, `userId`, `name`, `useAdminOwner`, `isReadOnly`, `bypassStepUp`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `principalId` | UUID |
| `entityId` | UUID |
| `ownerId` | UUID |

**Required create fields:** `principalId`, `entityId`, `ownerId`

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
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `principalId` | UUID |
| `membershipType` | Int |
| `allowedMask` | BitString |
| `useAdminOwner` | Boolean |
| `isActive` | Boolean |
| `isReadOnly` | Boolean |

**Required create fields:** `principalId`, `membershipType`, `allowedMask`, `useAdminOwner`, `isActive`, `isReadOnly`

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
| `name` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `email`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`, `name`

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
| `name` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `cc`, `number`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`, `name`

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
| `name` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `address`
**Optional create fields (backend defaults):** `ownerId`, `isVerified`, `isPrimary`, `name`

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
| `id` | UUID |
| `ownerId` | UUID |
| `credentialId` | String |
| `publicKey` | Base64EncodedBinary |
| `signCount` | BigInt |
| `webauthnUserId` | String |
| `transports` | String |
| `credentialDeviceType` | String |
| `backupEligible` | Boolean |
| `backupState` | Boolean |
| `name` | String |
| `lastUsedAt` | Datetime |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Required create fields:** `credentialId`, `publicKey`, `webauthnUserId`, `credentialDeviceType`
**Optional create fields (backend defaults):** `ownerId`, `signCount`, `transports`, `backupEligible`, `backupState`, `name`, `lastUsedAt`

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
| `createdAt` | Datetime |
| `id` | UUID |
| `event` | String |
| `actorId` | UUID |
| `origin` | Origin |
| `userAgent` | String |
| `ipAddress` | InternetAddress |
| `success` | Boolean |

**Required create fields:** `event`, `success`
**Optional create fields (backend defaults):** `actorId`, `origin`, `userAgent`, `ipAddress`

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
| `slug` | String |
| `kind` | String |
| `displayName` | String |
| `enabled` | Boolean |
| `isBuiltIn` | Boolean |

**Optional create fields (backend defaults):** `slug`, `kind`, `displayName`, `enabled`, `isBuiltIn`

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
| `id` | UUID |
| `ownerId` | UUID |
| `service` | String |
| `identifier` | String |
| `details` | JSON |
| `isVerified` | Boolean |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `ownerId`, `service`, `identifier`, `details`, `isVerified`

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
| `id` | UUID |
| `keyId` | String |
| `name` | String |
| `principalId` | UUID |
| `orgId` | UUID |
| `expiresAt` | Datetime |
| `revokedAt` | Datetime |
| `lastUsedAt` | Datetime |
| `mfaLevel` | String |
| `accessLevel` | String |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |

**Optional create fields (backend defaults):** `keyId`, `name`, `principalId`, `orgId`, `expiresAt`, `revokedAt`, `lastUsedAt`, `mfaLevel`, `accessLevel`

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

*Composite search (unifiedSearch dispatches to all text adapters):*
```bash
csdk user list --where.unifiedSearch "search query" --select title,tsvRank,displayNameTrgmSimilarity,searchScore
```

*Search with pagination and field projection:*
```bash
csdk user list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk user search "query" --limit 10 --select id,title,searchScore
```


## Custom Operations

### `current-user-agent`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `current-user-id`

currentUserId

- **Type:** query
- **Arguments:** none

### `current-ip-address`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `require-step-up`

requireStepUp

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--stepUpType` | String |

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
  | `--input.clientMutationId` | String |
  | `--input.accountId` | UUID (required) |

### `revoke-api-key`

revokeApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.keyId` | UUID (required) |

### `revoke-session`

revokeSession

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.sessionId` | UUID (required) |

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

### `confirm-delete-account`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.userId` | UUID |
  | `--input.token` | String |

### `revoke-org-api-key`

revokeOrgApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.keyId` | UUID (required) |
  | `--input.orgId` | UUID (required) |

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

### `provision-new-user`

provisionNewUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |

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

### `create-org-principal`

createOrgPrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.name` | String |
  | `--input.orgId` | UUID |
  | `--input.useAdminOwner` | Boolean |
  | `--input.isReadOnly` | Boolean |
  | `--input.bypassStepUp` | Boolean |

### `sign-in-cross-origin`

signInCrossOrigin

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.token` | String |
  | `--input.credentialKind` | String |

### `sign-in-sms-otp`

signInSmsOtp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.phone` | String |
  | `--input.code` | String |
  | `--input.credentialKind` | String |
  | `--input.rememberMe` | Boolean |
  | `--input.deviceToken` | String |

### `sign-up-sms`

signUpSms

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.phone` | String |
  | `--input.code` | String |
  | `--input.credentialKind` | String |
  | `--input.rememberMe` | Boolean |
  | `--input.deviceToken` | String |

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
  | `--input.deviceToken` | String |

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
  | `--input.deviceToken` | String |

### `link-identity`

linkIdentity

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.service` | String (required) |
  | `--input.identifier` | String (required) |
  | `--input.details` | JSON |

### `extend-token-expires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.amount` | IntervalInput |

### `create-org-api-key`

createOrgApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.orgId` | UUID |
  | `--input.principalId` | UUID |
  | `--input.keyName` | String |
  | `--input.accessLevel` | String |
  | `--input.mfaLevel` | String |
  | `--input.expiresIn` | IntervalInput |

### `create-api-key`

createApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.keyName` | String |
  | `--input.accessLevel` | String |
  | `--input.mfaLevel` | String |
  | `--input.expiresIn` | IntervalInput |
  | `--input.principalId` | UUID |

### `request-cross-origin-token`

requestCrossOriginToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.email` | String |
  | `--input.password` | String |
  | `--input.origin` | Origin |
  | `--input.rememberMe` | Boolean |

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
