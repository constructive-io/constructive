# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
db.appMembership.findMany({ select: { id: true } }).execute()
db.appMembership.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appMembership.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.appMembership.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.appMembership.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
