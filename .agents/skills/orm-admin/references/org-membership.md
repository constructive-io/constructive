# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
db.orgMembership.findMany({ select: { id: true } }).execute()
db.orgMembership.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMembership.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', isReadOnly: '<Boolean>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.orgMembership.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.orgMembership.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', isReadOnly: '<Boolean>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
