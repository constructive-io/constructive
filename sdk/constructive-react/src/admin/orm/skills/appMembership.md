# orm-appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppMembership records

## Usage

```typescript
db.appMembership.findMany({ select: { id: true } }).execute()
db.appMembership.findOne({ id: '<value>', select: { id: true } }).execute()
db.appMembership.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isBanned: '<value>', isDisabled: '<value>', isVerified: '<value>', isActive: '<value>', isOwner: '<value>', isAdmin: '<value>', permissions: '<value>', granted: '<value>', actorId: '<value>' }, select: { id: true } }).execute()
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
  data: { createdBy: 'value', updatedBy: 'value', isApproved: 'value', isBanned: 'value', isDisabled: 'value', isVerified: 'value', isActive: 'value', isOwner: 'value', isAdmin: 'value', permissions: 'value', granted: 'value', actorId: 'value' },
  select: { id: true }
}).execute();
```
