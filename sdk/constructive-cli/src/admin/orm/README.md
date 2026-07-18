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
| `appAdminGrant` | findMany, findOne, create, update, delete |
| `appClaimedInvite` | findMany, findOne, create, update, delete |
| `appGrant` | findMany, findOne, create, update, delete |
| `appInvite` | findMany, findOne, create, update, delete |
| `appMembership` | findMany, findOne, create, update, delete |
| `appMembershipDefault` | findMany, findOne, create, update, delete |
| `appOwnerGrant` | findMany, findOne, create, update, delete |
| `appPermission` | findMany, findOne, create, update, delete |
| `appPermissionDefault` | findMany, findOne, create, update, delete |
| `appPermissionDefaultGrant` | findMany, findOne, create, update, delete |
| `appPermissionDefaultPermission` | findMany, findOne, create, update, delete |
| `membershipType` | findMany, findOne, create, update, delete |
| `orgAdminGrant` | findMany, findOne, create, update, delete |
| `orgChartEdge` | findMany, findOne, create, update, delete |
| `orgChartEdgeGrant` | findMany, findOne, create, update, delete |
| `orgClaimedInvite` | findMany, findOne, create, update, delete |
| `orgGetManagersRecord` | findMany, findOne, create, update, delete |
| `orgGetSubordinatesRecord` | findMany, findOne, create, update, delete |
| `orgGrant` | findMany, findOne, create, update, delete |
| `orgInvite` | findMany, findOne, create, update, delete |
| `orgMember` | findMany, findOne, create, update, delete |
| `orgMemberProfile` | findMany, findOne, create, update, delete |
| `orgMembership` | findMany, findOne, create, update, delete |
| `orgMembershipDefault` | findMany, findOne, create, update, delete |
| `orgMembershipSetting` | findMany, findOne, create, update, delete |
| `orgOwnerGrant` | findMany, findOne, create, update, delete |
| `orgPermission` | findMany, findOne, create, update, delete |
| `orgPermissionDefault` | findMany, findOne, create, update, delete |
| `orgPermissionDefaultGrant` | findMany, findOne, create, update, delete |
| `orgPermissionDefaultPermission` | findMany, findOne, create, update, delete |

## Table Operations

### `db.appAdminGrant`

CRUD operations for AppAdminGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appAdminGrant records
const items = await db.appAdminGrant.findMany({ select: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appAdminGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Create
const created = await db.appAdminGrant.create({ data: { actorId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.appAdminGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appAdminGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appClaimedInvite`

CRUD operations for AppClaimedInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `id` | UUID | No |
| `receiverId` | UUID | Yes |
| `senderId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appClaimedInvite records
const items = await db.appClaimedInvite.findMany({ select: { createdAt: true, data: true, id: true, receiverId: true, senderId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appClaimedInvite.findOne({ id: '<UUID>', select: { createdAt: true, data: true, id: true, receiverId: true, senderId: true, updatedAt: true } }).execute();

// Create
const created = await db.appClaimedInvite.create({ data: { data: '<JSON>', receiverId: '<UUID>', senderId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appClaimedInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appGrant`

CRUD operations for AppGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appGrant records
const items = await db.appGrant.findMany({ select: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } }).execute();

// Create
const created = await db.appGrant.create({ data: { actorId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissions: '<BitString>' }, select: { id: true } }).execute();

// Update
const updated = await db.appGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appInvite`

CRUD operations for AppInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `channel` | String | Yes |
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `inviteCount` | Int | Yes |
| `inviteLimit` | Int | Yes |
| `inviteToken` | String | Yes |
| `inviteValid` | Boolean | Yes |
| `multiple` | Boolean | Yes |
| `phone` | String | Yes |
| `profileId` | UUID | Yes |
| `senderId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appInvite records
const items = await db.appInvite.findMany({ select: { channel: true, createdAt: true, data: true, email: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, multiple: true, phone: true, profileId: true, senderId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appInvite.findOne({ id: '<UUID>', select: { channel: true, createdAt: true, data: true, email: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, multiple: true, phone: true, profileId: true, senderId: true, updatedAt: true } }).execute();

// Create
const created = await db.appInvite.create({ data: { channel: '<String>', data: '<JSON>', email: '<Email>', expiresAt: '<Datetime>', inviteCount: '<Int>', inviteLimit: '<Int>', inviteToken: '<String>', inviteValid: '<Boolean>', multiple: '<Boolean>', phone: '<String>', profileId: '<UUID>', senderId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appInvite.update({ where: { id: '<UUID>' }, data: { channel: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appMembership`

CRUD operations for AppMembership records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `granted` | BitString | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `isApproved` | Boolean | Yes |
| `isBanned` | Boolean | Yes |
| `isDisabled` | Boolean | Yes |
| `isOwner` | Boolean | Yes |
| `isVerified` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `profileId` | UUID | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all appMembership records
const items = await db.appMembership.findMany({ select: { actorId: true, createdAt: true, createdBy: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.appMembership.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, createdBy: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isOwner: true, isVerified: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.appMembership.create({ data: { actorId: '<UUID>', createdBy: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isOwner: '<Boolean>', isVerified: '<Boolean>', permissions: '<BitString>', profileId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembership.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembership.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appMembershipDefault`

CRUD operations for AppMembershipDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `id` | UUID | No |
| `isApproved` | Boolean | Yes |
| `isVerified` | Boolean | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all appMembershipDefault records
const items = await db.appMembershipDefault.findMany({ select: { createdAt: true, createdBy: true, id: true, isApproved: true, isVerified: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.appMembershipDefault.findOne({ id: '<UUID>', select: { createdAt: true, createdBy: true, id: true, isApproved: true, isVerified: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.appMembershipDefault.create({ data: { createdBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appMembershipDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appOwnerGrant`

CRUD operations for AppOwnerGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appOwnerGrant records
const items = await db.appOwnerGrant.findMany({ select: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appOwnerGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Create
const created = await db.appOwnerGrant.create({ data: { actorId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.appOwnerGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appOwnerGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appPermission`

CRUD operations for AppPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `bitnum` | Int | Yes |
| `bitstr` | BitString | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all appPermission records
const items = await db.appPermission.findMany({ select: { bitnum: true, bitstr: true, description: true, id: true, name: true } }).execute();

// Get one by id
const item = await db.appPermission.findOne({ id: '<UUID>', select: { bitnum: true, bitstr: true, description: true, id: true, name: true } }).execute();

// Create
const created = await db.appPermission.create({ data: { bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermission.update({ where: { id: '<UUID>' }, data: { bitnum: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermission.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.appPermissionDefaultGrant`

CRUD operations for AppPermissionDefaultGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `permissionId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appPermissionDefaultGrant records
const items = await db.appPermissionDefaultGrant.findMany({ select: { createdAt: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appPermissionDefaultGrant.findOne({ id: '<UUID>', select: { createdAt: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } }).execute();

// Create
const created = await db.appPermissionDefaultGrant.create({ data: { grantorId: '<UUID>', isGrant: '<Boolean>', permissionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermissionDefaultGrant.update({ where: { id: '<UUID>' }, data: { grantorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermissionDefaultGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.appPermissionDefaultPermission`

CRUD operations for AppPermissionDefaultPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `id` | UUID | No |
| `permissionId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all appPermissionDefaultPermission records
const items = await db.appPermissionDefaultPermission.findMany({ select: { createdAt: true, id: true, permissionId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.appPermissionDefaultPermission.findOne({ id: '<UUID>', select: { createdAt: true, id: true, permissionId: true, updatedAt: true } }).execute();

// Create
const created = await db.appPermissionDefaultPermission.create({ data: { permissionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.appPermissionDefaultPermission.update({ where: { id: '<UUID>' }, data: { permissionId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.appPermissionDefaultPermission.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.membershipType`

CRUD operations for MembershipType records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `description` | String | Yes |
| `hasUsersTableEntry` | Boolean | Yes |
| `id` | Int | No |
| `name` | String | Yes |
| `parentMembershipType` | Int | Yes |
| `scope` | String | Yes |

**Operations:**

```typescript
// List all membershipType records
const items = await db.membershipType.findMany({ select: { description: true, hasUsersTableEntry: true, id: true, name: true, parentMembershipType: true, scope: true } }).execute();

// Get one by id
const item = await db.membershipType.findOne({ id: '<Int>', select: { description: true, hasUsersTableEntry: true, id: true, name: true, parentMembershipType: true, scope: true } }).execute();

// Create
const created = await db.membershipType.create({ data: { description: '<String>', hasUsersTableEntry: '<Boolean>', name: '<String>', parentMembershipType: '<Int>', scope: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.membershipType.update({ where: { id: '<Int>' }, data: { description: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.membershipType.delete({ where: { id: '<Int>' } }).execute();
```

### `db.orgAdminGrant`

CRUD operations for OrgAdminGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgAdminGrant records
const items = await db.orgAdminGrant.findMany({ select: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgAdminGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Create
const created = await db.orgAdminGrant.create({ data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgAdminGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgAdminGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgChartEdge`

CRUD operations for OrgChartEdge records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `childId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `parentId` | UUID | Yes |
| `positionLevel` | Int | Yes |
| `positionTitle` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgChartEdge records
const items = await db.orgChartEdge.findMany({ select: { childId: true, createdAt: true, entityId: true, id: true, parentId: true, positionLevel: true, positionTitle: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgChartEdge.findOne({ id: '<UUID>', select: { childId: true, createdAt: true, entityId: true, id: true, parentId: true, positionLevel: true, positionTitle: true, updatedAt: true } }).execute();

// Create
const created = await db.orgChartEdge.create({ data: { childId: '<UUID>', entityId: '<UUID>', parentId: '<UUID>', positionLevel: '<Int>', positionTitle: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgChartEdge.update({ where: { id: '<UUID>' }, data: { childId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgChartEdge.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgChartEdgeGrant`

CRUD operations for OrgChartEdgeGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `childId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `parentId` | UUID | Yes |
| `positionLevel` | Int | Yes |
| `positionTitle` | String | Yes |

**Operations:**

```typescript
// List all orgChartEdgeGrant records
const items = await db.orgChartEdgeGrant.findMany({ select: { childId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, parentId: true, positionLevel: true, positionTitle: true } }).execute();

// Get one by id
const item = await db.orgChartEdgeGrant.findOne({ id: '<UUID>', select: { childId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, parentId: true, positionLevel: true, positionTitle: true } }).execute();

// Create
const created = await db.orgChartEdgeGrant.create({ data: { childId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', parentId: '<UUID>', positionLevel: '<Int>', positionTitle: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgChartEdgeGrant.update({ where: { id: '<UUID>' }, data: { childId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgChartEdgeGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgClaimedInvite`

CRUD operations for OrgClaimedInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `receiverId` | UUID | Yes |
| `senderId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgClaimedInvite records
const items = await db.orgClaimedInvite.findMany({ select: { createdAt: true, data: true, entityId: true, id: true, receiverId: true, senderId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgClaimedInvite.findOne({ id: '<UUID>', select: { createdAt: true, data: true, entityId: true, id: true, receiverId: true, senderId: true, updatedAt: true } }).execute();

// Create
const created = await db.orgClaimedInvite.create({ data: { data: '<JSON>', entityId: '<UUID>', receiverId: '<UUID>', senderId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgClaimedInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGetManagersRecord`

CRUD operations for OrgGetManagersRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `depth` | Int | Yes |
| `userId` | UUID | Yes |

**Operations:**

```typescript
// List all orgGetManagersRecord records
const items = await db.orgGetManagersRecord.findMany({ select: { depth: true, userId: true } }).execute();

// Get one by id
const item = await db.orgGetManagersRecord.findOne({ id: '<UUID>', select: { depth: true, userId: true } }).execute();

// Create
const created = await db.orgGetManagersRecord.create({ data: { depth: '<Int>', userId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGetManagersRecord.update({ where: { id: '<UUID>' }, data: { depth: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGetManagersRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGetSubordinatesRecord`

CRUD operations for OrgGetSubordinatesRecord records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `depth` | Int | Yes |
| `userId` | UUID | Yes |

**Operations:**

```typescript
// List all orgGetSubordinatesRecord records
const items = await db.orgGetSubordinatesRecord.findMany({ select: { depth: true, userId: true } }).execute();

// Get one by id
const item = await db.orgGetSubordinatesRecord.findOne({ id: '<UUID>', select: { depth: true, userId: true } }).execute();

// Create
const created = await db.orgGetSubordinatesRecord.create({ data: { depth: '<Int>', userId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGetSubordinatesRecord.update({ where: { id: '<UUID>' }, data: { depth: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGetSubordinatesRecord.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgGrant`

CRUD operations for OrgGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgGrant records
const items = await db.orgGrant.findMany({ select: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissions: true, updatedAt: true } }).execute();

// Create
const created = await db.orgGrant.create({ data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissions: '<BitString>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgInvite`

CRUD operations for OrgInvite records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `channel` | String | Yes |
| `createdAt` | Datetime | No |
| `data` | JSON | Yes |
| `email` | ConstructiveInternalTypeEmail | Yes |
| `entityId` | UUID | Yes |
| `expiresAt` | Datetime | Yes |
| `id` | UUID | No |
| `inviteCount` | Int | Yes |
| `inviteLimit` | Int | Yes |
| `inviteToken` | String | Yes |
| `inviteValid` | Boolean | Yes |
| `isReadOnly` | Boolean | Yes |
| `multiple` | Boolean | Yes |
| `phone` | String | Yes |
| `profileId` | UUID | Yes |
| `receiverId` | UUID | Yes |
| `senderId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgInvite records
const items = await db.orgInvite.findMany({ select: { channel: true, createdAt: true, data: true, email: true, entityId: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, isReadOnly: true, multiple: true, phone: true, profileId: true, receiverId: true, senderId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgInvite.findOne({ id: '<UUID>', select: { channel: true, createdAt: true, data: true, email: true, entityId: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, isReadOnly: true, multiple: true, phone: true, profileId: true, receiverId: true, senderId: true, updatedAt: true } }).execute();

// Create
const created = await db.orgInvite.create({ data: { channel: '<String>', data: '<JSON>', email: '<Email>', entityId: '<UUID>', expiresAt: '<Datetime>', inviteCount: '<Int>', inviteLimit: '<Int>', inviteToken: '<String>', inviteValid: '<Boolean>', isReadOnly: '<Boolean>', multiple: '<Boolean>', phone: '<String>', profileId: '<UUID>', receiverId: '<UUID>', senderId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgInvite.update({ where: { id: '<UUID>' }, data: { channel: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgInvite.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMember`

CRUD operations for OrgMember records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `isAdmin` | Boolean | Yes |

**Operations:**

```typescript
// List all orgMember records
const items = await db.orgMember.findMany({ select: { actorId: true, entityId: true, id: true, isAdmin: true } }).execute();

// Get one by id
const item = await db.orgMember.findOne({ id: '<UUID>', select: { actorId: true, entityId: true, id: true, isAdmin: true } }).execute();

// Create
const created = await db.orgMember.create({ data: { actorId: '<UUID>', entityId: '<UUID>', isAdmin: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMember.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMember.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMemberProfile`

CRUD operations for OrgMemberProfile records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `bio` | String | Yes |
| `createdAt` | Datetime | No |
| `displayName` | String | Yes |
| `email` | String | Yes |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `membershipId` | UUID | Yes |
| `profilePicture` | ConstructiveInternalTypeImage | Yes |
| `title` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgMemberProfile records
const items = await db.orgMemberProfile.findMany({ select: { actorId: true, bio: true, createdAt: true, displayName: true, email: true, entityId: true, id: true, membershipId: true, profilePicture: true, title: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgMemberProfile.findOne({ id: '<UUID>', select: { actorId: true, bio: true, createdAt: true, displayName: true, email: true, entityId: true, id: true, membershipId: true, profilePicture: true, title: true, updatedAt: true } }).execute();

// Create
const created = await db.orgMemberProfile.create({ data: { actorId: '<UUID>', bio: '<String>', displayName: '<String>', email: '<String>', entityId: '<UUID>', membershipId: '<UUID>', profilePicture: '<Image>', title: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMemberProfile.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMemberProfile.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembership`

CRUD operations for OrgMembership records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `entityId` | UUID | Yes |
| `granted` | BitString | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isAdmin` | Boolean | Yes |
| `isApproved` | Boolean | Yes |
| `isBanned` | Boolean | Yes |
| `isDisabled` | Boolean | Yes |
| `isExternal` | Boolean | Yes |
| `isOwner` | Boolean | Yes |
| `isReadOnly` | Boolean | Yes |
| `permissions` | BitString | Yes |
| `profileId` | UUID | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembership records
const items = await db.orgMembership.findMany({ select: { actorId: true, createdAt: true, createdBy: true, entityId: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isExternal: true, isOwner: true, isReadOnly: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.orgMembership.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, createdBy: true, entityId: true, granted: true, id: true, isActive: true, isAdmin: true, isApproved: true, isBanned: true, isDisabled: true, isExternal: true, isOwner: true, isReadOnly: true, permissions: true, profileId: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.orgMembership.create({ data: { actorId: '<UUID>', createdBy: '<UUID>', entityId: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isReadOnly: '<Boolean>', permissions: '<BitString>', profileId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembership.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembership.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembershipDefault`

CRUD operations for OrgMembershipDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `isApproved` | Boolean | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembershipDefault records
const items = await db.orgMembershipDefault.findMany({ select: { createdAt: true, createdBy: true, entityId: true, id: true, isApproved: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.orgMembershipDefault.findOne({ id: '<UUID>', select: { createdAt: true, createdBy: true, entityId: true, id: true, isApproved: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.orgMembershipDefault.create({ data: { createdBy: '<UUID>', entityId: '<UUID>', isApproved: '<Boolean>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembershipDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgMembershipSetting`

CRUD operations for OrgMembershipSetting records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `allowExternalMembers` | Boolean | Yes |
| `createChildCascadeAdmins` | Boolean | Yes |
| `createChildCascadeMembers` | Boolean | Yes |
| `createChildCascadeOwners` | Boolean | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `deleteMemberCascadeChildren` | Boolean | Yes |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `inviteProfileAssignmentMode` | String | Yes |
| `limitAllocationMode` | String | Yes |
| `populateMemberEmail` | Boolean | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all orgMembershipSetting records
const items = await db.orgMembershipSetting.findMany({ select: { allowExternalMembers: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, createChildCascadeOwners: true, createdAt: true, createdBy: true, deleteMemberCascadeChildren: true, entityId: true, id: true, inviteProfileAssignmentMode: true, limitAllocationMode: true, populateMemberEmail: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.orgMembershipSetting.findOne({ id: '<UUID>', select: { allowExternalMembers: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, createChildCascadeOwners: true, createdAt: true, createdBy: true, deleteMemberCascadeChildren: true, entityId: true, id: true, inviteProfileAssignmentMode: true, limitAllocationMode: true, populateMemberEmail: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.orgMembershipSetting.create({ data: { allowExternalMembers: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', createChildCascadeOwners: '<Boolean>', createdBy: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', entityId: '<UUID>', inviteProfileAssignmentMode: '<String>', limitAllocationMode: '<String>', populateMemberEmail: '<Boolean>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgMembershipSetting.update({ where: { id: '<UUID>' }, data: { allowExternalMembers: '<Boolean>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgMembershipSetting.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgOwnerGrant`

CRUD operations for OrgOwnerGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgOwnerGrant records
const items = await db.orgOwnerGrant.findMany({ select: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgOwnerGrant.findOne({ id: '<UUID>', select: { actorId: true, createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, updatedAt: true } }).execute();

// Create
const created = await db.orgOwnerGrant.create({ data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgOwnerGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgOwnerGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermission`

CRUD operations for OrgPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `bitnum` | Int | Yes |
| `bitstr` | BitString | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `name` | String | Yes |

**Operations:**

```typescript
// List all orgPermission records
const items = await db.orgPermission.findMany({ select: { bitnum: true, bitstr: true, description: true, id: true, name: true } }).execute();

// Get one by id
const item = await db.orgPermission.findOne({ id: '<UUID>', select: { bitnum: true, bitstr: true, description: true, id: true, name: true } }).execute();

// Create
const created = await db.orgPermission.create({ data: { bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', name: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermission.update({ where: { id: '<UUID>' }, data: { bitnum: '<Int>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermission.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermissionDefault`

CRUD operations for OrgPermissionDefault records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `permissions` | BitString | Yes |

**Operations:**

```typescript
// List all orgPermissionDefault records
const items = await db.orgPermissionDefault.findMany({ select: { entityId: true, id: true, permissions: true } }).execute();

// Get one by id
const item = await db.orgPermissionDefault.findOne({ id: '<UUID>', select: { entityId: true, id: true, permissions: true } }).execute();

// Create
const created = await db.orgPermissionDefault.create({ data: { entityId: '<UUID>', permissions: '<BitString>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermissionDefault.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermissionDefault.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermissionDefaultGrant`

CRUD operations for OrgPermissionDefaultGrant records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `grantorId` | UUID | Yes |
| `id` | UUID | No |
| `isGrant` | Boolean | Yes |
| `permissionId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgPermissionDefaultGrant records
const items = await db.orgPermissionDefaultGrant.findMany({ select: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgPermissionDefaultGrant.findOne({ id: '<UUID>', select: { createdAt: true, entityId: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } }).execute();

// Create
const created = await db.orgPermissionDefaultGrant.create({ data: { entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermissionDefaultGrant.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermissionDefaultGrant.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.orgPermissionDefaultPermission`

CRUD operations for OrgPermissionDefaultPermission records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `entityId` | UUID | Yes |
| `id` | UUID | No |
| `permissionId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all orgPermissionDefaultPermission records
const items = await db.orgPermissionDefaultPermission.findMany({ select: { createdAt: true, entityId: true, id: true, permissionId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.orgPermissionDefaultPermission.findOne({ id: '<UUID>', select: { createdAt: true, entityId: true, id: true, permissionId: true, updatedAt: true } }).execute();

// Create
const created = await db.orgPermissionDefaultPermission.create({ data: { entityId: '<UUID>', permissionId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.orgPermissionDefaultPermission.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.orgPermissionDefaultPermission.delete({ where: { id: '<UUID>' } }).execute();
```

## Custom Operations

### `db.query.appPermissionsGetByMask`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `after` | Cursor |
  | `first` | Int |
  | `mask` | BitString |
  | `offset` | Int |

```typescript
const result = await db.query.appPermissionsGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute();
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

### `db.query.orgIsManagerOf`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `pEntityId` | UUID |
  | `pManagerId` | UUID |
  | `pMaxDepth` | Int |
  | `pUserId` | UUID |

```typescript
const result = await db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pMaxDepth: '<Int>', pUserId: '<UUID>' }).execute();
```

### `db.query.orgPermissionsGetByMask`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `after` | Cursor |
  | `first` | Int |
  | `mask` | BitString |
  | `offset` | Int |

```typescript
const result = await db.query.orgPermissionsGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute();
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

### `db.mutation.submitAppInviteCode`

submitAppInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitAppInviteCodeInput (required) |

```typescript
const result = await db.mutation.submitAppInviteCode({ input: { token: '<String>' } }).execute();
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
