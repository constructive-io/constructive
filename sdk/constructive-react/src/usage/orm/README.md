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
| `appLimitCapsDefault` | findMany, findOne, create, update, delete |
| `orgLimitCapsDefault` | findMany, findOne, create, update, delete |
| `appLimitCap` | findMany, findOne, create, update, delete |
| `orgLimitCap` | findMany, findOne, create, update, delete |
| `appLimitDefault` | findMany, findOne, create, update, delete |
| `appLimitCredit` | findMany, findOne, create, update, delete |
| `appLimitCreditCodeItem` | findMany, findOne, create, update, delete |
| `appLimitCreditRedemption` | findMany, findOne, create, update, delete |
| `orgLimitDefault` | findMany, findOne, create, update, delete |
| `orgLimitCredit` | findMany, findOne, create, update, delete |
| `appLimitWarning` | findMany, findOne, create, update, delete |
| `orgLimitWarning` | findMany, findOne, create, update, delete |
| `appLimitCreditCode` | findMany, findOne, create, update, delete |
| `appLimitEvent` | findMany, findOne, create, update, delete |
| `orgLimitEvent` | findMany, findOne, create, update, delete |
| `appLimit` | findMany, findOne, create, update, delete |
| `orgLimitAggregate` | findMany, findOne, create, update, delete |
| `orgLimit` | findMany, findOne, create, update, delete |

## Table Operations

### `db.appLimitCapsDefault`

CRUD operations for AppLimitCapsDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | BigInt | Yes |

**Operations:**

```typescript
// List all appLimitCapsDefault records
const items = await db.appLimitCapsDefault.findMany({ select: { id: true, name: true, max: true } }).execute();

// Get one by id
const item = await db.appLimitCapsDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.appLimitCapsDefault.create({ data: { name: '<String>', max: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCapsDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCapsDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitCapsDefault`

CRUD operations for OrgLimitCapsDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | BigInt | Yes |

**Operations:**

```typescript
// List all orgLimitCapsDefault records
const items = await db.orgLimitCapsDefault.findMany({ select: { id: true, name: true, max: true } }).execute();

// Get one by id
const item = await db.orgLimitCapsDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.orgLimitCapsDefault.create({ data: { name: '<String>', max: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitCapsDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitCapsDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCap`

CRUD operations for AppLimitCap records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `entityId` | UUID | Yes |
| `max` | BigInt | Yes |

**Operations:**

```typescript
// List all appLimitCap records
const items = await db.appLimitCap.findMany({ select: { id: true, name: true, entityId: true, max: true } }).execute();

// Get one by id
const item = await db.appLimitCap.findOne({ id: '<UUID>', select: { id: true, name: true, entityId: true, max: true } }).execute();

// Create
const created = await db.appLimitCap.create({ data: { name: '<String>', entityId: '<UUID>', max: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCap.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCap.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitCap`

CRUD operations for OrgLimitCap records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `entityId` | UUID | Yes |
| `max` | BigInt | Yes |

**Operations:**

```typescript
// List all orgLimitCap records
const items = await db.orgLimitCap.findMany({ select: { id: true, name: true, entityId: true, max: true } }).execute();

// Get one by id
const item = await db.orgLimitCap.findOne({ id: '<UUID>', select: { id: true, name: true, entityId: true, max: true } }).execute();

// Create
const created = await db.orgLimitCap.create({ data: { name: '<String>', entityId: '<UUID>', max: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitCap.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitCap.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitDefault`

CRUD operations for AppLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | BigInt | Yes |
| `softMax` | BigInt | Yes |

**Operations:**

```typescript
// List all appLimitDefault records
const items = await db.appLimitDefault.findMany({ select: { id: true, name: true, max: true, softMax: true } }).execute();

// Get one by id
const item = await db.appLimitDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true, softMax: true } }).execute();

// Create
const created = await db.appLimitDefault.create({ data: { name: '<String>', max: '<BigInt>', softMax: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCredit`

CRUD operations for AppLimitCredit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `defaultLimitId` | UUID | Yes |
| `actorId` | UUID | Yes |
| `amount` | BigInt | Yes |
| `creditType` | String | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all appLimitCredit records
const items = await db.appLimitCredit.findMany({ select: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } }).execute();

// Get one by id
const item = await db.appLimitCredit.findOne({ id: '<UUID>', select: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } }).execute();

// Create
const created = await db.appLimitCredit.create({ data: { defaultLimitId: '<UUID>', actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCredit.update({ where: { id: '<UUID>' }, data: { defaultLimitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCredit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCreditCodeItem`

CRUD operations for AppLimitCreditCodeItem records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `creditCodeId` | UUID | Yes |
| `defaultLimitId` | UUID | Yes |
| `amount` | BigInt | Yes |
| `creditType` | String | Yes |

**Operations:**

```typescript
// List all appLimitCreditCodeItem records
const items = await db.appLimitCreditCodeItem.findMany({ select: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } }).execute();

// Get one by id
const item = await db.appLimitCreditCodeItem.findOne({ id: '<UUID>', select: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } }).execute();

// Create
const created = await db.appLimitCreditCodeItem.create({ data: { creditCodeId: '<UUID>', defaultLimitId: '<UUID>', amount: '<BigInt>', creditType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCreditCodeItem.update({ where: { id: '<UUID>' }, data: { creditCodeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCreditCodeItem.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCreditRedemption`

CRUD operations for AppLimitCreditRedemption records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `creditCodeId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |

**Operations:**

```typescript
// List all appLimitCreditRedemption records
const items = await db.appLimitCreditRedemption.findMany({ select: { id: true, creditCodeId: true, entityId: true, organizationId: true, entityType: true } }).execute();

// Get one by id
const item = await db.appLimitCreditRedemption.findOne({ id: '<UUID>', select: { id: true, creditCodeId: true, entityId: true, organizationId: true, entityType: true } }).execute();

// Create
const created = await db.appLimitCreditRedemption.create({ data: { creditCodeId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCreditRedemption.update({ where: { id: '<UUID>' }, data: { creditCodeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCreditRedemption.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitDefault`

CRUD operations for OrgLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | BigInt | Yes |
| `softMax` | BigInt | Yes |

**Operations:**

```typescript
// List all orgLimitDefault records
const items = await db.orgLimitDefault.findMany({ select: { id: true, name: true, max: true, softMax: true } }).execute();

// Get one by id
const item = await db.orgLimitDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true, softMax: true } }).execute();

// Create
const created = await db.orgLimitDefault.create({ data: { name: '<String>', max: '<BigInt>', softMax: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitCredit`

CRUD operations for OrgLimitCredit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `defaultLimitId` | UUID | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |
| `amount` | BigInt | Yes |
| `creditType` | String | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all orgLimitCredit records
const items = await db.orgLimitCredit.findMany({ select: { id: true, defaultLimitId: true, actorId: true, entityId: true, organizationId: true, entityType: true, amount: true, creditType: true, reason: true } }).execute();

// Get one by id
const item = await db.orgLimitCredit.findOne({ id: '<UUID>', select: { id: true, defaultLimitId: true, actorId: true, entityId: true, organizationId: true, entityType: true, amount: true, creditType: true, reason: true } }).execute();

// Create
const created = await db.orgLimitCredit.create({ data: { defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitCredit.update({ where: { id: '<UUID>' }, data: { defaultLimitId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitCredit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitWarning`

CRUD operations for AppLimitWarning records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `warningType` | String | Yes |
| `thresholdValue` | BigInt | Yes |
| `taskIdentifier` | String | Yes |

**Operations:**

```typescript
// List all appLimitWarning records
const items = await db.appLimitWarning.findMany({ select: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } }).execute();

// Get one by id
const item = await db.appLimitWarning.findOne({ id: '<UUID>', select: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } }).execute();

// Create
const created = await db.appLimitWarning.create({ data: { name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitWarning.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitWarning.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitWarning`

CRUD operations for OrgLimitWarning records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `warningType` | String | Yes |
| `thresholdValue` | BigInt | Yes |
| `taskIdentifier` | String | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgLimitWarning records
const items = await db.orgLimitWarning.findMany({ select: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgLimitWarning.findOne({ id: '<UUID>', select: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } }).execute();

// Create
const created = await db.orgLimitWarning.create({ data: { name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitWarning.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitWarning.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCreditCode`

CRUD operations for AppLimitCreditCode records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `code` | String | Yes |
| `maxRedemptions` | Int | Yes |
| `currentRedemptions` | Int | Yes |
| `expiresAt` | Datetime | Yes |

**Operations:**

```typescript
// List all appLimitCreditCode records
const items = await db.appLimitCreditCode.findMany({ select: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } }).execute();

// Get one by id
const item = await db.appLimitCreditCode.findOne({ id: '<UUID>', select: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } }).execute();

// Create
const created = await db.appLimitCreditCode.create({ data: { code: '<String>', maxRedemptions: '<Int>', currentRedemptions: '<Int>', expiresAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCreditCode.update({ where: { id: '<UUID>' }, data: { code: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCreditCode.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitEvent`

CRUD operations for AppLimitEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |
| `eventType` | String | Yes |
| `delta` | BigInt | Yes |
| `numBefore` | BigInt | Yes |
| `numAfter` | BigInt | Yes |
| `maxAtEvent` | BigInt | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all appLimitEvent records
const items = await db.appLimitEvent.findMany({ select: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } }).execute();

// Get one by id
const item = await db.appLimitEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } }).execute();

// Create
const created = await db.appLimitEvent.create({ data: { name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitEvent.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitEvent`

CRUD operations for OrgLimitEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |
| `eventType` | String | Yes |
| `delta` | BigInt | Yes |
| `numBefore` | BigInt | Yes |
| `numAfter` | BigInt | Yes |
| `maxAtEvent` | BigInt | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all orgLimitEvent records
const items = await db.orgLimitEvent.findMany({ select: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } }).execute();

// Get one by id
const item = await db.orgLimitEvent.findOne({ id: '<UUID>', select: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } }).execute();

// Create
const created = await db.orgLimitEvent.create({ data: { name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitEvent.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimit`

CRUD operations for AppLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `num` | BigInt | Yes |
| `max` | BigInt | Yes |
| `softMax` | BigInt | Yes |
| `windowStart` | Datetime | Yes |
| `windowDuration` | Interval | Yes |
| `planMax` | BigInt | Yes |
| `purchasedCredits` | BigInt | Yes |
| `periodCredits` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |

**Operations:**

```typescript
// List all appLimit records
const items = await db.appLimit.findMany({ select: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } }).execute();

// Get one by id
const item = await db.appLimit.findOne({ id: '<UUID>', select: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } }).execute();

// Create
const created = await db.appLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitAggregate`

CRUD operations for OrgLimitAggregate records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `entityId` | UUID | Yes |
| `num` | BigInt | Yes |
| `max` | BigInt | Yes |
| `softMax` | BigInt | Yes |
| `windowStart` | Datetime | Yes |
| `windowDuration` | Interval | Yes |
| `planMax` | BigInt | Yes |
| `purchasedCredits` | BigInt | Yes |
| `periodCredits` | BigInt | Yes |
| `reserved` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |

**Operations:**

```typescript
// List all orgLimitAggregate records
const items = await db.orgLimitAggregate.findMany({ select: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } }).execute();

// Get one by id
const item = await db.orgLimitAggregate.findOne({ id: '<UUID>', select: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } }).execute();

// Create
const created = await db.orgLimitAggregate.create({ data: { name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitAggregate.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitAggregate.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimit`

CRUD operations for OrgLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `num` | BigInt | Yes |
| `max` | BigInt | Yes |
| `softMax` | BigInt | Yes |
| `windowStart` | Datetime | Yes |
| `windowDuration` | Interval | Yes |
| `planMax` | BigInt | Yes |
| `purchasedCredits` | BigInt | Yes |
| `periodCredits` | BigInt | Yes |
| `entityId` | UUID | Yes |
| `organizationId` | UUID | Yes |
| `entityType` | String | Yes |

**Operations:**

```typescript
// List all orgLimit records
const items = await db.orgLimit.findMany({ select: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true, organizationId: true, entityType: true } }).execute();

// Get one by id
const item = await db.orgLimit.findOne({ id: '<UUID>', select: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true, organizationId: true, entityType: true } }).execute();

// Create
const created = await db.orgLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimit.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.mutation.seedAppLimitCapsDefaults`

seedAppLimitCapsDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedAppLimitCapsDefaultsInput (required) |

```typescript
const result = await db.mutation.seedAppLimitCapsDefaults({ input: { defaults: '<JSON>' } }).execute();
```

### `db.mutation.seedAppLimitDefaults`

seedAppLimitDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedAppLimitDefaultsInput (required) |

```typescript
const result = await db.mutation.seedAppLimitDefaults({ input: { defaults: '<JSON>' } }).execute();
```

### `db.mutation.seedOrgLimitCapsDefaults`

seedOrgLimitCapsDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedOrgLimitCapsDefaultsInput (required) |

```typescript
const result = await db.mutation.seedOrgLimitCapsDefaults({ input: { defaults: '<JSON>' } }).execute();
```

### `db.mutation.seedOrgLimitDefaults`

seedOrgLimitDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedOrgLimitDefaultsInput (required) |

```typescript
const result = await db.mutation.seedOrgLimitDefaults({ input: { defaults: '<JSON>' } }).execute();
```

### `db.mutation.provisionBucket`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

```typescript
const result = await db.mutation.provisionBucket({ input: { bucketKey: '<String>', ownerId: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
