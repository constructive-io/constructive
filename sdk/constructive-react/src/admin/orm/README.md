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
| `orgGetManagersRecord` | findMany, findOne, create, update, delete |
| `orgGetSubordinatesRecord` | findMany, findOne, create, update, delete |
| `appPermission` | findMany, findOne, create, update, delete |
| `orgPermission` | findMany, findOne, create, update, delete |
| `appLevelRequirement` | findMany, findOne, create, update, delete |
| `orgMember` | findMany, findOne, create, update, delete |
| `appPermissionDefault` | findMany, findOne, create, update, delete |
| `orgPermissionDefault` | findMany, findOne, create, update, delete |
| `appAdminGrant` | findMany, findOne, create, update, delete |
| `appOwnerGrant` | findMany, findOne, create, update, delete |
| `orgAdminGrant` | findMany, findOne, create, update, delete |
| `orgOwnerGrant` | findMany, findOne, create, update, delete |
| `appLimitDefault` | findMany, findOne, create, update, delete |
| `orgLimitDefault` | findMany, findOne, create, update, delete |
| `orgChartEdgeGrant` | findMany, findOne, create, update, delete |
| `membershipType` | findMany, findOne, create, update, delete |
| `appLimit` | findMany, findOne, create, update, delete |
| `appAchievement` | findMany, findOne, create, update, delete |
| `appStep` | findMany, findOne, create, update, delete |
| `claimedInvite` | findMany, findOne, create, update, delete |
| `appGrant` | findMany, findOne, create, update, delete |
| `appMembershipDefault` | findMany, findOne, create, update, delete |
| `orgLimit` | findMany, findOne, create, update, delete |
| `orgClaimedInvite` | findMany, findOne, create, update, delete |
| `orgGrant` | findMany, findOne, create, update, delete |
| `orgChartEdge` | findMany, findOne, create, update, delete |
| `orgMembershipDefault` | findMany, findOne, create, update, delete |
| `appMembership` | findMany, findOne, create, update, delete |
| `orgMembership` | findMany, findOne, create, update, delete |
| `invite` | findMany, findOne, create, update, delete |
| `appLevel` | findMany, findOne, create, update, delete |
| `orgInvite` | findMany, findOne, create, update, delete |

## Table Operations

### `db.orgGetManagersRecord`

CRUD operations for OrgGetManagersRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `userId` | UUID | Yes |
| `depth` | Int | Yes |

**Operations:**

```typescript
// List all orgGetManagersRecord records
const items = await db.orgGetManagersRecord.findMany({ select: { userId: true, depth: true } }).execute();

// Get one by id
const item = await db.orgGetManagersRecord.findOne({ id: '<UUID>', select: { userId: true, depth: true } }).execute();

// Create
const created = await db.orgGetManagersRecord.create({ data: { userId: '<UUID>', depth: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGetManagersRecord.update({ where: { id: '<UUID>' }, data: { userId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGetManagersRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGetSubordinatesRecord`

CRUD operations for OrgGetSubordinatesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `userId` | UUID | Yes |
| `depth` | Int | Yes |

**Operations:**

```typescript
// List all orgGetSubordinatesRecord records
const items = await db.orgGetSubordinatesRecord.findMany({ select: { userId: true, depth: true } }).execute();

// Get one by id
const item = await db.orgGetSubordinatesRecord.findOne({ id: '<UUID>', select: { userId: true, depth: true } }).execute();

// Create
const created = await db.orgGetSubordinatesRecord.create({ data: { userId: '<UUID>', depth: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGetSubordinatesRecord.update({ where: { id: '<UUID>' }, data: { userId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGetSubordinatesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appPermission`

CRUD operations for AppPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `bitnum` | Int | Yes |
| `bitstr` | BitString | Yes |
| `description` | String | Yes |

**Operations:**

```typescript
// List all appPermission records
const items = await db.appPermission.findMany({ select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Get one by id
const item = await db.appPermission.findOne({ id: '<UUID>', select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Create
const created = await db.appPermission.create({ data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermission.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermission.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermission`

CRUD operations for OrgPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `bitnum` | Int | Yes |
| `bitstr` | BitString | Yes |
| `description` | String | Yes |

**Operations:**

```typescript
// List all orgPermission records
const items = await db.orgPermission.findMany({ select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Get one by id
const item = await db.orgPermission.findOne({ id: '<UUID>', select: { id: true, name: true, bitnum: true, bitstr: true, description: true } }).execute();

// Create
const created = await db.orgPermission.create({ data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermission.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermission.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevelRequirement`

CRUD operations for AppLevelRequirement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `level` | String | Yes |
| `description` | String | Yes |
| `requiredCount` | Int | Yes |
| `priority` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevelRequirement records
const items = await db.appLevelRequirement.findMany({ select: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevelRequirement.findOne({ id: '<UUID>', select: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevelRequirement.create({ data: { name: '<String>', level: '<String>', description: '<String>', requiredCount: '<Int>', priority: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevelRequirement.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevelRequirement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMember`

CRUD operations for OrgMember records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isAdmin` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgMember records
const items = await db.orgMember.findMany({ select: { id: true, isAdmin: true, actorId: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgMember.findOne({ id: '<UUID>', select: { id: true, isAdmin: true, actorId: true, entityId: true } }).execute();

// Create
const created = await db.orgMember.create({ data: { isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMember.update({ where: { id: '<UUID>' }, data: { isAdmin: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMember.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appPermissionDefault`

CRUD operations for AppPermissionDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |

**Operations:**

```typescript
// List all appPermissionDefault records
const items = await db.appPermissionDefault.findMany({ select: { id: true, permissions: true } }).execute();

// Get one by id
const item = await db.appPermissionDefault.findOne({ id: '<UUID>', select: { id: true, permissions: true } }).execute();

// Create
const created = await db.appPermissionDefault.create({ data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermissionDefault.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermissionDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermissionDefault`

CRUD operations for OrgPermissionDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgPermissionDefault records
const items = await db.orgPermissionDefault.findMany({ select: { id: true, permissions: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgPermissionDefault.findOne({ id: '<UUID>', select: { id: true, permissions: true, entityId: true } }).execute();

// Create
const created = await db.orgPermissionDefault.create({ data: { permissions: '<BitString>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermissionDefault.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermissionDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appAdminGrant`

CRUD operations for AppAdminGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appAdminGrant records
const items = await db.appAdminGrant.findMany({ select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appAdminGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appAdminGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAdminGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAdminGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appOwnerGrant`

CRUD operations for AppOwnerGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appOwnerGrant records
const items = await db.appOwnerGrant.findMany({ select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appOwnerGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appOwnerGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appOwnerGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appOwnerGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgAdminGrant`

CRUD operations for OrgAdminGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgAdminGrant records
const items = await db.orgAdminGrant.findMany({ select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgAdminGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgAdminGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgAdminGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgAdminGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgOwnerGrant`

CRUD operations for OrgOwnerGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgOwnerGrant records
const items = await db.orgOwnerGrant.findMany({ select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgOwnerGrant.findOne({ id: '<UUID>', select: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgOwnerGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgOwnerGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgOwnerGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLimitDefault`

CRUD operations for AppLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | Int | Yes |

**Operations:**

```typescript
// List all appLimitDefault records
const items = await db.appLimitDefault.findMany({ select: { id: true, name: true, max: true } }).execute();

// Get one by id
const item = await db.appLimitDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.appLimitDefault.create({ data: { name: '<String>', max: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimitDefault`

CRUD operations for OrgLimitDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `max` | Int | Yes |

**Operations:**

```typescript
// List all orgLimitDefault records
const items = await db.orgLimitDefault.findMany({ select: { id: true, name: true, max: true } }).execute();

// Get one by id
const item = await db.orgLimitDefault.findOne({ id: '<UUID>', select: { id: true, name: true, max: true } }).execute();

// Create
const created = await db.orgLimitDefault.create({ data: { name: '<String>', max: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimitDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgChartEdgeGrant`

CRUD operations for OrgChartEdgeGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `entityId` | UUID | Yes |
| `childId` | UUID | Yes |
| `parentId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `isGrant` | Boolean | Yes |
| `positionTitle` | String | Yes |
| `positionLevel` | Int | Yes |
| `createdAt` | Datetime | No |

**Operations:**

```typescript
// List all orgChartEdgeGrant records
const items = await db.orgChartEdgeGrant.findMany({ select: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } }).execute();

// Get one by id
const item = await db.orgChartEdgeGrant.findOne({ id: '<UUID>', select: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } }).execute();

// Create
const created = await db.orgChartEdgeGrant.create({ data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgChartEdgeGrant.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgChartEdgeGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.membershipType`

CRUD operations for MembershipType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | Int | No |
| `name` | String | Yes |
| `description` | String | Yes |
| `prefix` | String | Yes |

**Operations:**

```typescript
// List all membershipType records
const items = await db.membershipType.findMany({ select: { id: true, name: true, description: true, prefix: true } }).execute();

// Get one by id
const item = await db.membershipType.findOne({ id: '<Int>', select: { id: true, name: true, description: true, prefix: true } }).execute();

// Create
const created = await db.membershipType.create({ data: { name: '<String>', description: '<String>', prefix: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipType.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipType.delete({ where: { id: '<Int>' } }).execute();
```

### `db.appLimit`

CRUD operations for AppLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `num` | Int | Yes |
| `max` | Int | Yes |

**Operations:**

```typescript
// List all appLimit records
const items = await db.appLimit.findMany({ select: { id: true, name: true, actorId: true, num: true, max: true } }).execute();

// Get one by id
const item = await db.appLimit.findOne({ id: '<UUID>', select: { id: true, name: true, actorId: true, num: true, max: true } }).execute();

// Create
const created = await db.appLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appAchievement`

CRUD operations for AppAchievement records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `actorId` | UUID | Yes |
| `name` | String | Yes |
| `count` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appAchievement records
const items = await db.appAchievement.findMany({ select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appAchievement.findOne({ id: '<UUID>', select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appAchievement.create({ data: { actorId: '<UUID>', name: '<String>', count: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAchievement.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAchievement.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appStep`

CRUD operations for AppStep records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `actorId` | UUID | Yes |
| `name` | String | Yes |
| `count` | Int | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appStep records
const items = await db.appStep.findMany({ select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appStep.findOne({ id: '<UUID>', select: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appStep.create({ data: { actorId: '<UUID>', name: '<String>', count: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.appStep.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appStep.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.claimedInvite`

CRUD operations for ClaimedInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `data` | JSON | Yes |
| `senderId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all claimedInvite records
const items = await db.claimedInvite.findMany({ select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.claimedInvite.findOne({ id: '<UUID>', select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.claimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.claimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.claimedInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appGrant`

CRUD operations for AppGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appGrant records
const items = await db.appGrant.findMany({ select: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appGrant.findOne({ id: '<UUID>', select: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appGrant.create({ data: { permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appGrant.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appMembershipDefault`

CRUD operations for AppMembershipDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `isVerified` | Boolean | Yes |

**Operations:**

```typescript
// List all appMembershipDefault records
const items = await db.appMembershipDefault.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } }).execute();

// Get one by id
const item = await db.appMembershipDefault.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } }).execute();

// Create
const created = await db.appMembershipDefault.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembershipDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgLimit`

CRUD operations for OrgLimit records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `actorId` | UUID | Yes |
| `num` | Int | Yes |
| `max` | Int | Yes |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgLimit records
const items = await db.orgLimit.findMany({ select: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgLimit.findOne({ id: '<UUID>', select: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } }).execute();

// Create
const created = await db.orgLimit.create({ data: { name: '<String>', actorId: '<UUID>', num: '<Int>', max: '<Int>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgLimit.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgLimit.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgClaimedInvite`

CRUD operations for OrgClaimedInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `data` | JSON | Yes |
| `senderId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgClaimedInvite records
const items = await db.orgClaimedInvite.findMany({ select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgClaimedInvite.findOne({ id: '<UUID>', select: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Create
const created = await db.orgClaimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgClaimedInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGrant`

CRUD operations for OrgGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `permissions` | BitString | Yes |
| `isGrant` | Boolean | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgGrant records
const items = await db.orgGrant.findMany({ select: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgGrant.findOne({ id: '<UUID>', select: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.orgGrant.create({ data: { permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGrant.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgChartEdge`

CRUD operations for OrgChartEdge records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `childId` | UUID | Yes |
| `parentId` | UUID | Yes |
| `positionTitle` | String | Yes |
| `positionLevel` | Int | Yes |

**Operations:**

```typescript
// List all orgChartEdge records
const items = await db.orgChartEdge.findMany({ select: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } }).execute();

// Get one by id
const item = await db.orgChartEdge.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } }).execute();

// Create
const created = await db.orgChartEdge.create({ data: { entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgChartEdge.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgChartEdge.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembershipDefault`

CRUD operations for OrgMembershipDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `entityId` | UUID | Yes |
| `deleteMemberCascadeGroups` | Boolean | Yes |
| `createGroupsCascadeMembers` | Boolean | Yes |

**Operations:**

```typescript
// List all orgMembershipDefault records
const items = await db.orgMembershipDefault.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } }).execute();

// Get one by id
const item = await db.orgMembershipDefault.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true, deleteMemberCascadeGroups: true, createGroupsCascadeMembers: true } }).execute();

// Create
const created = await db.orgMembershipDefault.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>', deleteMemberCascadeGroups: '<Boolean>', createGroupsCascadeMembers: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembershipDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appMembership`

CRUD operations for AppMembership records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `isBanned` | Boolean | Yes |
| `isDisabled` | Boolean | Yes |
| `isVerified` | Boolean | Yes |
| `isActive` | Boolean | Yes |
| `isOwner` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `granted` | BitString | Yes |
| `actorId` | UUID | Yes |
| `profileId` | UUID | Yes |

**Operations:**

```typescript
// List all appMembership records
const items = await db.appMembership.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } }).execute();

// Get one by id
const item = await db.appMembership.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } }).execute();

// Create
const created = await db.appMembership.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembership.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembership.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembership`

CRUD operations for OrgMembership records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `isApproved` | Boolean | Yes |
| `isBanned` | Boolean | Yes |
| `isDisabled` | Boolean | Yes |
| `isActive` | Boolean | Yes |
| `isOwner` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `granted` | BitString | Yes |
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `profileId` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembership records
const items = await db.orgMembership.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } }).execute();

// Get one by id
const item = await db.orgMembership.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, profileId: true } }).execute();

// Create
const created = await db.orgMembership.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembership.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembership.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.invite`

CRUD operations for Invite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `senderId` | UUID | Yes |
| `inviteToken` | String | Yes |
| `inviteValid` | Boolean | Yes |
| `inviteLimit` | Int | Yes |
| `inviteCount` | Int | Yes |
| `multiple` | Boolean | Yes |
| `data` | JSON | Yes |
| `expiresAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all invite records
const items = await db.invite.findMany({ select: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.invite.findOne({ id: '<UUID>', select: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.invite.create({ data: { email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' }, select: { id: true } }).execute();

// Update
const updated = await db.invite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.invite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appLevel`

CRUD operations for AppLevel records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `name` | String | Yes |
| `description` | String | Yes |
| `image` | ConstructiveInternalTypeImage | Yes |
| `ownerId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appLevel records
const items = await db.appLevel.findMany({ select: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appLevel.findOne({ id: '<UUID>', select: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } }).execute();

// Create
const created = await db.appLevel.create({ data: { name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appLevel.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appLevel.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgInvite`

CRUD operations for OrgInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `senderId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `inviteToken` | String | Yes |
| `inviteValid` | Boolean | Yes |
| `inviteLimit` | Int | Yes |
| `inviteCount` | Int | Yes |
| `multiple` | Boolean | Yes |
| `data` | JSON | Yes |
| `expiresAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `entityId` | UUID | Yes |

**Operations:**

```typescript
// List all orgInvite records
const items = await db.orgInvite.findMany({ select: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Get one by id
const item = await db.orgInvite.findOne({ id: '<UUID>', select: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } }).execute();

// Create
const created = await db.orgInvite.create({ data: { email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>', entityId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgInvite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgInvite.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.appPermissionsGetPaddedMask`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

```typescript
const result = await db.query.appPermissionsGetPaddedMask({ mask: '<BitString>' }).execute();
```

### `db.query.orgPermissionsGetPaddedMask`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

```typescript
const result = await db.query.orgPermissionsGetPaddedMask({ mask: '<BitString>' }).execute();
```

### `db.query.orgIsManagerOf`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `pEntityId` | UUID |
  | `pManagerId` | UUID |
  | `pUserId` | UUID |
  | `pMaxDepth` | Int |

```typescript
const result = await db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pUserId: '<UUID>', pMaxDepth: '<Int>' }).execute();
```

### `db.query.appPermissionsGetMask`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

```typescript
const result = await db.query.appPermissionsGetMask({ ids: '<UUID>' }).execute();
```

### `db.query.orgPermissionsGetMask`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

```typescript
const result = await db.query.orgPermissionsGetMask({ ids: '<UUID>' }).execute();
```

### `db.query.stepsAchieved`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |

```typescript
const result = await db.query.stepsAchieved({ vlevel: '<String>', vroleId: '<UUID>' }).execute();
```

### `db.query.appPermissionsGetMaskByNames`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

```typescript
const result = await db.query.appPermissionsGetMaskByNames({ names: '<String>' }).execute();
```

### `db.query.orgPermissionsGetMaskByNames`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

```typescript
const result = await db.query.orgPermissionsGetMaskByNames({ names: '<String>' }).execute();
```

### `db.query.appPermissionsGetByMask`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.appPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.orgPermissionsGetByMask`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.orgPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.query.stepsRequired`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `vlevel` | String |
  | `vroleId` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

```typescript
const result = await db.query.stepsRequired({ vlevel: '<String>', vroleId: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```

### `db.mutation.submitInviteCode`

submitInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitInviteCode({ input: { token: '<String>' } }).execute();
```

### `db.mutation.submitOrgInviteCode`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitOrgInviteCode({ input: { token: '<String>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
