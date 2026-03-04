---
name: orm-admin-org-membership
description: Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status
---

# orm-admin-org-membership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
db.orgMembership.findMany({ select: { id: true } }).execute()
db.orgMembership.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgMembership.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', entityId: '<value>', profileId: '<value>' }, select: { id: true } }).execute()
db.orgMembership.update({ where: { id: '<value>' }, data: { createdBy: '<new>' }, select: { id: true } }).execute()
db.orgMembership.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgMembership records

```typescript
const items = await db.orgMembership.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a orgMembership

```typescript
const item = await db.orgMembership.create({
  data: { createdBy: 'value', updatedBy: 'value', isApproved: 'value', isBanned: 'value', isDisabled: 'value', isActive: 'value', isOwner: 'value', isAdmin: 'value', permissions: 'value', granted: 'value', actorId: 'value', entityId: 'value', profileId: 'value' },
  select: { id: true }
}).execute();
```
