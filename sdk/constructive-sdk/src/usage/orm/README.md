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
| `appAchievementReward` | findMany, findOne, create, update, delete |
| `appEventAggregate` | findMany, findOne, create, update, delete |
| `appEvent` | findMany, findOne, create, update, delete |
| `appEventType` | findMany, findOne, create, update, delete |
| `appLevel` | findMany, findOne, create, update, delete |
| `appLevelGrant` | findMany, findOne, create, update, delete |
| `appLevelRequirement` | findMany, findOne, create, update, delete |
| `appLimitCap` | findMany, findOne, create, update, delete |
| `appLimitCapsDefault` | findMany, findOne, create, update, delete |
| `appLimit` | findMany, findOne, create, update, delete |
| `appLimitCreditCode` | findMany, findOne, create, update, delete |
| `appLimitCreditCodeItem` | findMany, findOne, create, update, delete |
| `appLimitCredit` | findMany, findOne, create, update, delete |
| `appLimitCreditRedemption` | findMany, findOne, create, update, delete |
| `appLimitDefault` | findMany, findOne, create, update, delete |
| `appLimitEvent` | findMany, findOne, create, update, delete |
| `appLimitWarning` | findMany, findOne, create, update, delete |
| `billingUsageSummary` | findMany, findOne, create, update, delete |
| `ledger` | findMany, findOne, create, update, delete |
| `meter` | findMany, findOne, create, update, delete |
| `meterCredit` | findMany, findOne, create, update, delete |
| `meterDefault` | findMany, findOne, create, update, delete |
| `meterSource` | findMany, findOne, create, update, delete |
| `orgLimitAggregate` | findMany, findOne, create, update, delete |
| `orgLimitCap` | findMany, findOne, create, update, delete |
| `orgLimitCapsDefault` | findMany, findOne, create, update, delete |
| `orgLimit` | findMany, findOne, create, update, delete |
| `orgLimitCredit` | findMany, findOne, create, update, delete |
| `orgLimitDefault` | findMany, findOne, create, update, delete |
| `orgLimitEvent` | findMany, findOne, create, update, delete |
| `orgLimitWarning` | findMany, findOne, create, update, delete |
| `planCap` | findMany, findOne, create, update, delete |
| `plan` | findMany, findOne, create, update, delete |
| `planLimit` | findMany, findOne, create, update, delete |
| `planMeterLimit` | findMany, findOne, create, update, delete |
| `planOverride` | findMany, findOne, create, update, delete |
| `planPricing` | findMany, findOne, create, update, delete |
| `planSubscription` | findMany, findOne, create, update, delete |

## Table Operations

### `db.appAchievementReward`

CRUD operations for AppAchievementReward records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `amount` | Int | Yes |
| `createdAt` | Datetime | No |
| `creditType` | String | Yes |
| `expiresInterval` | Interval | Yes |
| `id` | UUID | No |
| `levelName` | String | Yes |
| `rewardType` | String | Yes |
| `targetName` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appAchievementReward records
const items = await db.appAchievementReward.findMany({ select: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appAchievementReward.findOne({ id: '<UUID>', select: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } }).execute();

// Create
const created = await db.appAchievementReward.create({ data: { amount: '<Int>', creditType: '<String>', expiresInterval: '<Interval>', levelName: '<String>', rewardType: '<String>', targetName: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAchievementReward.update({ where: { id: '<UUID>' }, data: { amount: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAchievementReward.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appEventAggregate`

CRUD operations for AppEventAggregate records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `count` | Int | Yes |
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `name` | String | Yes |
| `periodStart` | Datetime | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appEventAggregate records
const items = await db.appEventAggregate.findMany({ select: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appEventAggregate.findOne({ id: '<UUID>', select: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } }).execute();

// Create
const created = await db.appEventAggregate.create({ data: { actorId: '<UUID>', count: '<Int>', name: '<String>', periodStart: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.appEventAggregate.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appEventAggregate.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appEvent`

CRUD operations for AppEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `count` | Int | Yes |
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all appEvent records
const items = await db.appEvent.findMany({ select: { actorId: true, count: true, createdAt: true, id: true, name: true } }).execute();

// Get one by id
const item = await db.appEvent.findOne({ id: '<UUID>', select: { actorId: true, count: true, createdAt: true, id: true, name: true } }).execute();

// Create
const created = await db.appEvent.create({ data: { actorId: '<UUID>', count: '<Int>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appEventType`

CRUD operations for AppEventType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `aggregation` | String | Yes |
| `category` | String | Yes |
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `feedsLevels` | Boolean | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `name` | String | Yes |
| `periodInterval` | Interval | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appEventType records
const items = await db.appEventType.findMany({ select: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appEventType.findOne({ id: '<UUID>', select: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } }).execute();

// Create
const created = await db.appEventType.create({ data: { aggregation: '<String>', category: '<String>', description: '<String>', feedsLevels: '<Boolean>', isActive: '<Boolean>', name: '<String>', periodInterval: '<Interval>' }, select: { id: true } }).execute();

// Update
const updated = await db.appEventType.update({ where: { id: '<UUID>' }, data: { aggregation: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appEventType.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevel`

CRUD operations for AppLevel records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `id` | UUID | No |
| `image` | ConstructiveInternalTypeImage | Yes |
| `name` | String | Yes |
| `ownerId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevel records
const items = await db.appLevel.findMany({ select: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevel.findOne({ id: '<UUID>', select: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevel.create({ data: { description: '<String>', image: '<Image>', name: '<String>', ownerId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevel.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevel.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevelGrant`

CRUD operations for AppLevelGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `levelName` | String | Yes |
| `periodStart` | Datetime | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevelGrant records
const items = await db.appLevelGrant.findMany({ select: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevelGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevelGrant.create({ data: { actorId: '<UUID>', expiresAt: '<Datetime>', levelName: '<String>', periodStart: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevelGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevelGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevelRequirement`

CRUD operations for AppLevelRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `description` | String | Yes |
| `groupKey` | String | Yes |
| `id` | UUID | No |
| `level` | String | Yes |
| `metric` | String | Yes |
| `name` | String | Yes |
| `priority` | Int | Yes |
| `requiredCount` | Int | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevelRequirement records
const items = await db.appLevelRequirement.findMany({ select: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevelRequirement.findOne({ id: '<UUID>', select: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevelRequirement.create({ data: { description: '<String>', groupKey: '<String>', level: '<String>', metric: '<String>', name: '<String>', priority: '<Int>', requiredCount: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevelRequirement.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevelRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCap`

CRUD operations for AppLimitCap records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |

**Operations:**

```typescript
// List all appLimitCap records
const items = await db.appLimitCap.findMany({ select: { entityId: true, id: true, max: true, name: true } }).execute();

// Get one by id
const item = await db.appLimitCap.findOne({ id: '<UUID>', select: { entityId: true, id: true, max: true, name: true } }).execute();

// Create
const created = await db.appLimitCap.create({ data: { entityId: '<UUID>', max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCap.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCap.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCapsDefault`

CRUD operations for AppLimitCapsDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |

**Operations:**

```typescript
// List all appLimitCapsDefault records
const items = await db.appLimitCapsDefault.findMany({ select: { id: true, max: true, name: true } }).execute();

// Get one by id
const item = await db.appLimitCapsDefault.findOne({ id: '<UUID>', select: { id: true, max: true, name: true } }).execute();

// Create
const created = await db.appLimitCapsDefault.create({ data: { max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCapsDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCapsDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimit`

CRUD operations for AppLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |
| `num` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `periodCredits` | BigInt | Yes |
| `planMax` | BigInt | Yes |
| `purchasedCredits` | BigInt | Yes |
| `softMax` | BigInt | Yes |
| `windowDuration` | Interval | Yes |
| `windowStart` | Datetime | Yes |

**Operations:**

```typescript
// List all appLimit records
const items = await db.appLimit.findMany({ select: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } }).execute();

// Get one by id
const item = await db.appLimit.findOne({ id: '<UUID>', select: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } }).execute();

// Create
const created = await db.appLimit.create({ data: { actorId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCreditCode`

CRUD operations for AppLimitCreditCode records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `code` | String | Yes |
| `currentRedemptions` | Int | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `maxRedemptions` | Int | Yes |

**Operations:**

```typescript
// List all appLimitCreditCode records
const items = await db.appLimitCreditCode.findMany({ select: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } }).execute();

// Get one by id
const item = await db.appLimitCreditCode.findOne({ id: '<UUID>', select: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } }).execute();

// Create
const created = await db.appLimitCreditCode.create({ data: { code: '<String>', currentRedemptions: '<Int>', expiresAt: '<Datetime>', maxRedemptions: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCreditCode.update({ where: { id: '<UUID>' }, data: { code: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCreditCode.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCreditCodeItem`

CRUD operations for AppLimitCreditCodeItem records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `amount` | BigInt | Yes |
| `creditCodeId` | UUID | Yes |
| `creditType` | String | Yes |
| `defaultLimitId` | UUID | Yes |
| `id` | UUID | No |

**Operations:**

```typescript
// List all appLimitCreditCodeItem records
const items = await db.appLimitCreditCodeItem.findMany({ select: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } }).execute();

// Get one by id
const item = await db.appLimitCreditCodeItem.findOne({ id: '<UUID>', select: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } }).execute();

// Create
const created = await db.appLimitCreditCodeItem.create({ data: { amount: '<BigInt>', creditCodeId: '<UUID>', creditType: '<String>', defaultLimitId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCreditCodeItem.update({ where: { id: '<UUID>' }, data: { amount: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCreditCodeItem.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCredit`

CRUD operations for AppLimitCredit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `amount` | BigInt | Yes |
| `creditType` | String | Yes |
| `defaultLimitId` | UUID | Yes |
| `id` | UUID | No |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all appLimitCredit records
const items = await db.appLimitCredit.findMany({ select: { actorId: true, amount: true, creditType: true, defaultLimitId: true, id: true, reason: true } }).execute();

// Get one by id
const item = await db.appLimitCredit.findOne({ id: '<UUID>', select: { actorId: true, amount: true, creditType: true, defaultLimitId: true, id: true, reason: true } }).execute();

// Create
const created = await db.appLimitCredit.create({ data: { actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCredit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCredit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitCreditRedemption`

CRUD operations for AppLimitCreditRedemption records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `creditCodeId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `organizationId` | UUID | Yes |

**Operations:**

```typescript
// List all appLimitCreditRedemption records
const items = await db.appLimitCreditRedemption.findMany({ select: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } }).execute();

// Get one by id
const item = await db.appLimitCreditRedemption.findOne({ id: '<UUID>', select: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } }).execute();

// Create
const created = await db.appLimitCreditRedemption.create({ data: { creditCodeId: '<UUID>', entityId: '<UUID>', entityType: '<String>', organizationId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitCreditRedemption.update({ where: { id: '<UUID>' }, data: { creditCodeId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitCreditRedemption.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitDefault`

CRUD operations for AppLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |
| `softMax` | BigInt | Yes |

**Operations:**

```typescript
// List all appLimitDefault records
const items = await db.appLimitDefault.findMany({ select: { id: true, max: true, name: true, softMax: true } }).execute();

// Get one by id
const item = await db.appLimitDefault.findOne({ id: '<UUID>', select: { id: true, max: true, name: true, softMax: true } }).execute();

// Create
const created = await db.appLimitDefault.create({ data: { max: '<BigInt>', name: '<String>', softMax: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitEvent`

CRUD operations for AppLimitEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `delta` | BigInt | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `maxAtEvent` | BigInt | Yes |
| `name` | String | Yes |
| `numAfter` | BigInt | Yes |
| `numBefore` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all appLimitEvent records
const items = await db.appLimitEvent.findMany({ select: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } }).execute();

// Get one by id
const item = await db.appLimitEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } }).execute();

// Create
const created = await db.appLimitEvent.create({ data: { actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitWarning`

CRUD operations for AppLimitWarning records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `taskIdentifier` | String | Yes |
| `thresholdValue` | BigInt | Yes |
| `warningType` | String | Yes |

**Operations:**

```typescript
// List all appLimitWarning records
const items = await db.appLimitWarning.findMany({ select: { id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } }).execute();

// Get one by id
const item = await db.appLimitWarning.findOne({ id: '<UUID>', select: { id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } }).execute();

// Create
const created = await db.appLimitWarning.create({ data: { name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitWarning.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitWarning.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.billingUsageSummary`

CRUD operations for BillingUsageSummary records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `creditsConsumed` | BigInt | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `meterSlug` | String | Yes |
| `organizationId` | UUID | Yes |
| `overageUnits` | BigInt | Yes |
| `periodEnd` | Datetime | Yes |
| `periodStart` | Datetime | Yes |
| `planLimit` | BigInt | Yes |
| `quantityUsed` | BigInt | Yes |

**Operations:**

```typescript
// List all billingUsageSummary records
const items = await db.billingUsageSummary.findMany({ select: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } }).execute();

// Get one by id
const item = await db.billingUsageSummary.findOne({ id: '<UUID>', select: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } }).execute();

// Create
const created = await db.billingUsageSummary.create({ data: { creditsConsumed: '<BigInt>', entityId: '<UUID>', entityType: '<String>', meterSlug: '<String>', organizationId: '<UUID>', overageUnits: '<BigInt>', periodEnd: '<Datetime>', periodStart: '<Datetime>', planLimit: '<BigInt>', quantityUsed: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.billingUsageSummary.update({ where: { id: '<UUID>' }, data: { creditsConsumed: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.billingUsageSummary.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.ledger`

CRUD operations for Ledger records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `delta` | BigInt | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `entryType` | String | Yes |
| `id` | UUID | No |
| `ledgerClass` | String | Yes |
| `metadata` | JSON | Yes |
| `meterSlug` | String | Yes |
| `organizationId` | UUID | Yes |
| `usageAfter` | BigInt | Yes |

**Operations:**

```typescript
// List all ledger records
const items = await db.ledger.findMany({ select: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } }).execute();

// Get one by id
const item = await db.ledger.findOne({ id: '<UUID>', select: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } }).execute();

// Create
const created = await db.ledger.create({ data: { delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', entryType: '<String>', ledgerClass: '<String>', metadata: '<JSON>', meterSlug: '<String>', organizationId: '<UUID>', usageAfter: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.ledger.update({ where: { id: '<UUID>' }, data: { delta: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.ledger.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.meter`

CRUD operations for Meter records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `aggregation` | String | Yes |
| `categoryMeter` | String | Yes |
| `creditCost` | Int | Yes |
| `displayName` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `meterType` | String | Yes |
| `periodInterval` | Interval | Yes |
| `rolloverCap` | BigInt | Yes |
| `slug` | String | Yes |
| `unit` | String | Yes |

**Operations:**

```typescript
// List all meter records
const items = await db.meter.findMany({ select: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } }).execute();

// Get one by id
const item = await db.meter.findOne({ id: '<UUID>', select: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } }).execute();

// Create
const created = await db.meter.create({ data: { aggregation: '<String>', categoryMeter: '<String>', creditCost: '<Int>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', periodInterval: '<Interval>', rolloverCap: '<BigInt>', slug: '<String>', unit: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.meter.update({ where: { id: '<UUID>' }, data: { aggregation: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.meter.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.meterCredit`

CRUD operations for MeterCredit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `amount` | BigInt | Yes |
| `createdAt` | Datetime | No |
| `creditType` | String | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `meterId` | UUID | Yes |
| `organizationId` | UUID | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all meterCredit records
const items = await db.meterCredit.findMany({ select: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } }).execute();

// Get one by id
const item = await db.meterCredit.findOne({ id: '<UUID>', select: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } }).execute();

// Create
const created = await db.meterCredit.create({ data: { amount: '<BigInt>', creditType: '<String>', entityId: '<UUID>', entityType: '<String>', expiresAt: '<Datetime>', meterId: '<UUID>', organizationId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.meterCredit.update({ where: { id: '<UUID>' }, data: { amount: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.meterCredit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.meterDefault`

CRUD operations for MeterDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `categoryMeter` | String | Yes |
| `creditCost` | BigFloat | Yes |
| `defaultPlanLimit` | BigInt | Yes |
| `displayName` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `meterType` | String | Yes |
| `slug` | String | Yes |
| `unit` | String | Yes |

**Operations:**

```typescript
// List all meterDefault records
const items = await db.meterDefault.findMany({ select: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } }).execute();

// Get one by id
const item = await db.meterDefault.findOne({ id: '<UUID>', select: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } }).execute();

// Create
const created = await db.meterDefault.create({ data: { categoryMeter: '<String>', creditCost: '<BigFloat>', defaultPlanLimit: '<BigInt>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', slug: '<String>', unit: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.meterDefault.update({ where: { id: '<UUID>' }, data: { categoryMeter: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.meterDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.meterSource`

CRUD operations for MeterSource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `aggregationType` | String | Yes |
| `dimensionPath` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `meterSlug` | String | Yes |
| `sourceMetric` | String | Yes |

**Operations:**

```typescript
// List all meterSource records
const items = await db.meterSource.findMany({ select: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } }).execute();

// Get one by id
const item = await db.meterSource.findOne({ id: '<UUID>', select: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } }).execute();

// Create
const created = await db.meterSource.create({ data: { aggregationType: '<String>', dimensionPath: '<String>', isActive: '<Boolean>', meterSlug: '<String>', sourceMetric: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.meterSource.update({ where: { id: '<UUID>' }, data: { aggregationType: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.meterSource.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitAggregate`

CRUD operations for OrgLimitAggregate records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |
| `num` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `periodCredits` | BigInt | Yes |
| `planMax` | BigInt | Yes |
| `purchasedCredits` | BigInt | Yes |
| `reserved` | BigInt | Yes |
| `softMax` | BigInt | Yes |
| `windowDuration` | Interval | Yes |
| `windowStart` | Datetime | Yes |

**Operations:**

```typescript
// List all orgLimitAggregate records
const items = await db.orgLimitAggregate.findMany({ select: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } }).execute();

// Get one by id
const item = await db.orgLimitAggregate.findOne({ id: '<UUID>', select: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } }).execute();

// Create
const created = await db.orgLimitAggregate.create({ data: { entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', reserved: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitAggregate.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitAggregate.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitCap`

CRUD operations for OrgLimitCap records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |

**Operations:**

```typescript
// List all orgLimitCap records
const items = await db.orgLimitCap.findMany({ select: { entityId: true, id: true, max: true, name: true } }).execute();

// Get one by id
const item = await db.orgLimitCap.findOne({ id: '<UUID>', select: { entityId: true, id: true, max: true, name: true } }).execute();

// Create
const created = await db.orgLimitCap.create({ data: { entityId: '<UUID>', max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitCap.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitCap.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitCapsDefault`

CRUD operations for OrgLimitCapsDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |

**Operations:**

```typescript
// List all orgLimitCapsDefault records
const items = await db.orgLimitCapsDefault.findMany({ select: { id: true, max: true, name: true } }).execute();

// Get one by id
const item = await db.orgLimitCapsDefault.findOne({ id: '<UUID>', select: { id: true, max: true, name: true } }).execute();

// Create
const created = await db.orgLimitCapsDefault.create({ data: { max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitCapsDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitCapsDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimit`

CRUD operations for OrgLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |
| `num` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `periodCredits` | BigInt | Yes |
| `planMax` | BigInt | Yes |
| `purchasedCredits` | BigInt | Yes |
| `softMax` | BigInt | Yes |
| `windowDuration` | Interval | Yes |
| `windowStart` | Datetime | Yes |

**Operations:**

```typescript
// List all orgLimit records
const items = await db.orgLimit.findMany({ select: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } }).execute();

// Get one by id
const item = await db.orgLimit.findOne({ id: '<UUID>', select: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } }).execute();

// Create
const created = await db.orgLimit.create({ data: { actorId: '<UUID>', entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitCredit`

CRUD operations for OrgLimitCredit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `amount` | BigInt | Yes |
| `creditType` | String | Yes |
| `defaultLimitId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `organizationId` | UUID | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all orgLimitCredit records
const items = await db.orgLimitCredit.findMany({ select: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } }).execute();

// Get one by id
const item = await db.orgLimitCredit.findOne({ id: '<UUID>', select: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } }).execute();

// Create
const created = await db.orgLimitCredit.create({ data: { actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', organizationId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitCredit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitCredit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitDefault`

CRUD operations for OrgLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `max` | BigInt | Yes |
| `name` | String | Yes |
| `softMax` | BigInt | Yes |

**Operations:**

```typescript
// List all orgLimitDefault records
const items = await db.orgLimitDefault.findMany({ select: { id: true, max: true, name: true, softMax: true } }).execute();

// Get one by id
const item = await db.orgLimitDefault.findOne({ id: '<UUID>', select: { id: true, max: true, name: true, softMax: true } }).execute();

// Create
const created = await db.orgLimitDefault.create({ data: { max: '<BigInt>', name: '<String>', softMax: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitEvent`

CRUD operations for OrgLimitEvent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `delta` | BigInt | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `eventType` | String | Yes |
| `id` | UUID | No |
| `maxAtEvent` | BigInt | Yes |
| `name` | String | Yes |
| `numAfter` | BigInt | Yes |
| `numBefore` | BigInt | Yes |
| `organizationId` | UUID | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all orgLimitEvent records
const items = await db.orgLimitEvent.findMany({ select: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } }).execute();

// Get one by id
const item = await db.orgLimitEvent.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } }).execute();

// Create
const created = await db.orgLimitEvent.create({ data: { actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitEvent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitWarning`

CRUD operations for OrgLimitWarning records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `name` | String | Yes |
| `taskIdentifier` | String | Yes |
| `thresholdValue` | BigInt | Yes |
| `warningType` | String | Yes |

**Operations:**

```typescript
// List all orgLimitWarning records
const items = await db.orgLimitWarning.findMany({ select: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } }).execute();

// Get one by id
const item = await db.orgLimitWarning.findOne({ id: '<UUID>', select: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } }).execute();

// Create
const created = await db.orgLimitWarning.create({ data: { entityId: '<UUID>', name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitWarning.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitWarning.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.planCap`

CRUD operations for PlanCap records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `capName` | String | Yes |
| `capValue` | BigInt | Yes |
| `id` | UUID | No |
| `planId` | UUID | Yes |

**Operations:**

```typescript
// List all planCap records
const items = await db.planCap.findMany({ select: { capName: true, capValue: true, id: true, planId: true } }).execute();

// Get one by id
const item = await db.planCap.findOne({ id: '<UUID>', select: { capName: true, capValue: true, id: true, planId: true } }).execute();

// Create
const created = await db.planCap.create({ data: { capName: '<String>', capValue: '<BigInt>', planId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.planCap.update({ where: { id: '<UUID>' }, data: { capName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.planCap.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.plan`

CRUD operations for Plan records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `description` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `name` | String | Yes |

**Operations:**

```typescript
// List all plan records
const items = await db.plan.findMany({ select: { description: true, id: true, isActive: true, name: true } }).execute();

// Get one by id
const item = await db.plan.findOne({ id: '<UUID>', select: { description: true, id: true, isActive: true, name: true } }).execute();

// Create
const created = await db.plan.create({ data: { description: '<String>', isActive: '<Boolean>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.plan.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.plan.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.planLimit`

CRUD operations for PlanLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `limitName` | String | Yes |
| `maxValue` | BigInt | Yes |
| `planId` | UUID | Yes |

**Operations:**

```typescript
// List all planLimit records
const items = await db.planLimit.findMany({ select: { id: true, limitName: true, maxValue: true, planId: true } }).execute();

// Get one by id
const item = await db.planLimit.findOne({ id: '<UUID>', select: { id: true, limitName: true, maxValue: true, planId: true } }).execute();

// Create
const created = await db.planLimit.create({ data: { limitName: '<String>', maxValue: '<BigInt>', planId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.planLimit.update({ where: { id: '<UUID>' }, data: { limitName: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.planLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.planMeterLimit`

CRUD operations for PlanMeterLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `meterSlug` | String | Yes |
| `planId` | UUID | Yes |
| `planLimit` | BigInt | Yes |

**Operations:**

```typescript
// List all planMeterLimit records
const items = await db.planMeterLimit.findMany({ select: { id: true, meterSlug: true, planId: true, planLimit: true } }).execute();

// Get one by id
const item = await db.planMeterLimit.findOne({ id: '<UUID>', select: { id: true, meterSlug: true, planId: true, planLimit: true } }).execute();

// Create
const created = await db.planMeterLimit.create({ data: { meterSlug: '<String>', planId: '<UUID>', planLimit: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.planMeterLimit.update({ where: { id: '<UUID>' }, data: { meterSlug: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.planMeterLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.planOverride`

CRUD operations for PlanOverride records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `entityId` | UUID | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `limitName` | String | Yes |
| `maxValue` | BigInt | Yes |
| `reason` | String | Yes |

**Operations:**

```typescript
// List all planOverride records
const items = await db.planOverride.findMany({ select: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } }).execute();

// Get one by id
const item = await db.planOverride.findOne({ id: '<UUID>', select: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } }).execute();

// Create
const created = await db.planOverride.create({ data: { entityId: '<UUID>', expiresAt: '<Datetime>', limitName: '<String>', maxValue: '<BigInt>', reason: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.planOverride.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.planOverride.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.planPricing`

CRUD operations for PlanPricing records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `billingInterval` | String | Yes |
| `currency` | String | Yes |
| `discountPercent` | BigFloat | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `planId` | UUID | Yes |
| `price` | BigInt | Yes |

**Operations:**

```typescript
// List all planPricing records
const items = await db.planPricing.findMany({ select: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } }).execute();

// Get one by id
const item = await db.planPricing.findOne({ id: '<UUID>', select: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } }).execute();

// Create
const created = await db.planPricing.create({ data: { billingInterval: '<String>', currency: '<String>', discountPercent: '<BigFloat>', isActive: '<Boolean>', planId: '<UUID>', price: '<BigInt>' }, select: { id: true } }).execute();

// Update
const updated = await db.planPricing.update({ where: { id: '<UUID>' }, data: { billingInterval: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.planPricing.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.planSubscription`

CRUD operations for PlanSubscription records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `endsAt` | Datetime | Yes |
| `entityId` | UUID | Yes |
| `entityType` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `organizationId` | UUID | Yes |
| `planId` | UUID | Yes |
| `startsAt` | Datetime | Yes |

**Operations:**

```typescript
// List all planSubscription records
const items = await db.planSubscription.findMany({ select: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } }).execute();

// Get one by id
const item = await db.planSubscription.findOne({ id: '<UUID>', select: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } }).execute();

// Create
const created = await db.planSubscription.create({ data: { endsAt: '<Datetime>', entityId: '<UUID>', entityType: '<String>', isActive: '<Boolean>', organizationId: '<UUID>', planId: '<UUID>', startsAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.planSubscription.update({ where: { id: '<UUID>' }, data: { endsAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.planSubscription.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.captureAppLimitDefaults`

captureAppLimitDefaults

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.captureAppLimitDefaults().execute();
```

### `db.query.captureOrgLimitDefaults`

captureOrgLimitDefaults

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.captureOrgLimitDefaults().execute();
```

### `db.query.captureTrustLadder`

captureTrustLadder

- **Type:** query
- **Arguments:** none

```typescript
const result = await db.query.captureTrustLadder().execute();
```

### `db.query.eventsAchieved`

eventsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `level` | String |
  | `roleId` | UUID |

```typescript
const result = await db.query.eventsAchieved({ level: '<String>', roleId: '<UUID>' }).execute();
```

### `db.query.eventsRequired`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `after` | Cursor |
  | `first` | Int |
  | `level` | String |
  | `offset` | Int |
  | `roleId` | UUID |

```typescript
const result = await db.query.eventsRequired({ after: '<Cursor>', first: '<Int>', level: '<String>', offset: '<Int>', roleId: '<UUID>' }).execute();
```

### `db.mutation.grantAchievement`

grantAchievement

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | GrantAchievementInput (required) |

```typescript
const result = await db.mutation.grantAchievement({ input: { actorId: '<UUID>', levelName: '<String>' } }).execute();
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

### `db.mutation.recomputeCapabilities`

recomputeCapabilities

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RecomputeCapabilitiesInput (required) |

```typescript
const result = await db.mutation.recomputeCapabilities({ input: { actorId: '<UUID>' } }).execute();
```

### `db.mutation.revokeAchievement`

revokeAchievement

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeAchievementInput (required) |

```typescript
const result = await db.mutation.revokeAchievement({ input: { actorId: '<UUID>', levelName: '<String>' } }).execute();
```

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

### `db.mutation.seedMeterDefaults`

seedMeterDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedMeterDefaultsInput (required) |

```typescript
const result = await db.mutation.seedMeterDefaults({ input: { defaults: '<JSON>' } }).execute();
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

### `db.mutation.seedPlan`

seedPlan

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedPlanInput (required) |

```typescript
const result = await db.mutation.seedPlan({ input: { planConfig: '<JSON>', planName: '<String>' } }).execute();
```

### `db.mutation.seedTrustLadder`

seedTrustLadder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedTrustLadderInput (required) |

```typescript
const result = await db.mutation.seedTrustLadder({ input: { ladder: '<JSON>' } }).execute();
```
