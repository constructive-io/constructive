# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with capability bitmasks, ownership, and admin status

## Usage

```typescript
db.orgMembership.findMany({ select: { id: true } }).execute()
db.orgMembership.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMembership.create({ data: { actorId: '<UUID>', capabilities: '<BitString>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', entityId: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isReadOnly: '<Boolean>', profileId: '<UUID>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.orgMembership.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgMembership.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMembership records

```typescript
const items = await db.orgMembership.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgMembership

```typescript
const item = await db.orgMembership.create({
  data: { actorId: '<UUID>', capabilities: '<BitString>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', entityId: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isReadOnly: '<Boolean>', profileId: '<UUID>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
