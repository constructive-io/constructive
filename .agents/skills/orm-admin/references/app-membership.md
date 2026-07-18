# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status

## Usage

```typescript
db.appMembership.findMany({ select: { id: true } }).execute()
db.appMembership.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appMembership.create({ data: { actorId: '<UUID>', createdBy: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isOwner: '<Boolean>', isVerified: '<Boolean>', permissions: '<BitString>', profileId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.appMembership.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appMembership.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appMembership records

```typescript
const items = await db.appMembership.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appMembership

```typescript
const item = await db.appMembership.create({
  data: { actorId: '<UUID>', createdBy: '<UUID>', granted: '<BitString>', isActive: '<Boolean>', isAdmin: '<Boolean>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isOwner: '<Boolean>', isVerified: '<Boolean>', permissions: '<BitString>', profileId: '<UUID>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
