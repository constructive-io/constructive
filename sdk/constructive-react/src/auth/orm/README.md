# ORM Client

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { createClient } from './orm';

const db = createClient({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});
```

## Models

| Model | Operations |
|-------|------------|
| `roleType` | findMany, findOne, create, update, delete |
| `cryptoAddress` | findMany, findOne, create, update, delete |
| `phoneNumber` | findMany, findOne, create, update, delete |
| `connectedAccount` | findMany, findOne, create, update, delete |
| `email` | findMany, findOne, create, update, delete |
| `auditLog` | findMany, findOne, create, update, delete |
| `user` | findMany, findOne, create, update, delete |

## Table Operations

### `db.roleType`

CRUD operations for RoleType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | Int | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all roleType records
const items = await db.roleType.findMany({ select: { id: true, name: true } }).execute();

// Get one by id
const item = await db.roleType.findOne({ id: '<value>', select: { id: true, name: true } }).execute();

// Create
const created = await db.roleType.create({ data: { name: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.roleType.update({ where: { id: '<value>' }, data: { name: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.roleType.delete({ where: { id: '<value>' } }).execute();
```

### `db.cryptoAddress`

CRUD operations for CryptoAddress records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `address` | String | Yes |
| `isVerified` | Boolean | Yes |
| `isPrimary` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all cryptoAddress records
const items = await db.cryptoAddress.findMany({ select: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.cryptoAddress.findOne({ id: '<value>', select: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.cryptoAddress.create({ data: { ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.cryptoAddress.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.cryptoAddress.delete({ where: { id: '<value>' } }).execute();
```

### `db.phoneNumber`

CRUD operations for PhoneNumber records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `cc` | String | Yes |
| `number` | String | Yes |
| `isVerified` | Boolean | Yes |
| `isPrimary` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all phoneNumber records
const items = await db.phoneNumber.findMany({ select: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.phoneNumber.findOne({ id: '<value>', select: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.phoneNumber.create({ data: { ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.phoneNumber.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.phoneNumber.delete({ where: { id: '<value>' } }).execute();
```

### `db.connectedAccount`

CRUD operations for ConnectedAccount records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `service` | String | Yes |
| `identifier` | String | Yes |
| `details` | JSON | Yes |
| `isVerified` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all connectedAccount records
const items = await db.connectedAccount.findMany({ select: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.connectedAccount.findOne({ id: '<value>', select: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.connectedAccount.create({ data: { ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.connectedAccount.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.connectedAccount.delete({ where: { id: '<value>' } }).execute();
```

### `db.email`

CRUD operations for Email records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `isVerified` | Boolean | Yes |
| `isPrimary` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all email records
const items = await db.email.findMany({ select: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.email.findOne({ id: '<value>', select: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.email.create({ data: { ownerId: '<value>', email: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.email.update({ where: { id: '<value>' }, data: { ownerId: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.email.delete({ where: { id: '<value>' } }).execute();
```

### `db.auditLog`

CRUD operations for AuditLog records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `event` | String | Yes |
| `actorId` | UUID | Yes |
| `origin` | ConstructiveInternalTypeOrigin | Yes |
| `userAgent` | String | Yes |
| `ipAddress` | InternetAddress | Yes |
| `success` | Boolean | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all auditLog records
const items = await db.auditLog.findMany({ select: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } }).execute();

// Get one by id
const item = await db.auditLog.findOne({ id: '<value>', select: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true } }).execute();

// Create
const created = await db.auditLog.create({ data: { event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.auditLog.update({ where: { id: '<value>' }, data: { event: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.auditLog.delete({ where: { id: '<value>' } }).execute();
```

### `db.user`

CRUD operations for User records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `username` | String | Yes |
| `displayName` | String | Yes |
| `profilePicture` | ConstructiveInternalTypeImage | Yes |
| `searchTsv` | FullText | Yes |
| `type` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `searchTsvRank` | Float | Yes |

**Operations:**

```typescript
// List all user records
const items = await db.user.findMany({ select: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true } }).execute();

// Get one by id
const item = await db.user.findOne({ id: '<value>', select: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true } }).execute();

// Create
const created = await db.user.create({ data: { username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>' }, select: { id: true } }).execute();

// Update
const updated = await db.user.update({ where: { id: '<value>' }, data: { username: '<new-value>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.user.delete({ where: { id: '<value>' } }).execute();
```

## Custom Operations

### `db.query.currentIpAddress`

currentIpAddress

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentIpAddress().execute();
```

### `db.query.currentUserAgent`

currentUserAgent

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUserAgent().execute();
```

### `db.query.currentUserId`

currentUserId

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUserId().execute();
```

### `db.query.currentUser`

currentUser

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.currentUser().execute();
```

### `db.mutation.signOut`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignOutInput (required) |

```typescript
const result = await db.mutation.signOut({ input: '<value>' }).execute();
```

### `db.mutation.sendAccountDeletionEmail`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

```typescript
const result = await db.mutation.sendAccountDeletionEmail({ input: '<value>' }).execute();
```

### `db.mutation.checkPassword`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

```typescript
const result = await db.mutation.checkPassword({ input: '<value>' }).execute();
```

### `db.mutation.confirmDeleteAccount`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

```typescript
const result = await db.mutation.confirmDeleteAccount({ input: '<value>' }).execute();
```

### `db.mutation.setPassword`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPasswordInput (required) |

```typescript
const result = await db.mutation.setPassword({ input: '<value>' }).execute();
```

### `db.mutation.verifyEmail`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyEmailInput (required) |

```typescript
const result = await db.mutation.verifyEmail({ input: '<value>' }).execute();
```

### `db.mutation.resetPassword`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

```typescript
const result = await db.mutation.resetPassword({ input: '<value>' }).execute();
```

### `db.mutation.signInOneTimeToken`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInOneTimeTokenInput (required) |

```typescript
const result = await db.mutation.signInOneTimeToken({ input: '<value>' }).execute();
```

### `db.mutation.signIn`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

```typescript
const result = await db.mutation.signIn({ input: '<value>' }).execute();
```

### `db.mutation.signUp`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

```typescript
const result = await db.mutation.signUp({ input: '<value>' }).execute();
```

### `db.mutation.oneTimeToken`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OneTimeTokenInput (required) |

```typescript
const result = await db.mutation.oneTimeToken({ input: '<value>' }).execute();
```

### `db.mutation.extendTokenExpires`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

```typescript
const result = await db.mutation.extendTokenExpires({ input: '<value>' }).execute();
```

### `db.mutation.forgotPassword`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

```typescript
const result = await db.mutation.forgotPassword({ input: '<value>' }).execute();
```

### `db.mutation.sendVerificationEmail`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

```typescript
const result = await db.mutation.sendVerificationEmail({ input: '<value>' }).execute();
```

### `db.mutation.verifyPassword`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyPasswordInput (required) |

```typescript
const result = await db.mutation.verifyPassword({ input: '<value>' }).execute();
```

### `db.mutation.verifyTotp`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyTotpInput (required) |

```typescript
const result = await db.mutation.verifyTotp({ input: '<value>' }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
