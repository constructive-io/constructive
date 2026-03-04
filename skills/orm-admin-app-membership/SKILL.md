---
name: orm-admin-app-membership
description: Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status
---

# orm-admin-app-membership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
db.appMembership.findMany({ select: { id: true } }).execute()
db.appMembership.findOne({ id: '<value>', select: { id: true } }).execute()
db.appMembership.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>', profileId: '<value>' }, select: { id: true } }).execute()
db.appMembership.update({ where: { id: '<value>' }, data: { createdBy: '<new>' }, select: { id: true } }).execute()
db.appMembership.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appMembership records

```typescript
const items = await db.appMembership.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a appMembership

```typescript
const item = await db.appMembership.create({
  data: { createdBy: 'value', updatedBy: 'value', isApproved: 'value', isBanned: 'value', isDisabled: 'value', isVerified: 'value', isActive: 'value', isOwner: 'value', isAdmin: 'value', permissions: 'value', granted: 'value', actorId: 'value', profileId: 'value' },
  select: { id: true }
}).execute();
```
