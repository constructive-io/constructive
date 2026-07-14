# appPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of permission additions and removals from the defaults bitmask

## Usage

```typescript
db.appPermissionDefaultGrant.findMany({ select: { id: true } }).execute()
db.appPermissionDefaultGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appPermissionDefaultGrant.create({ data: { grantorId: '<UUID>', isGrant: '<Boolean>', permissionId: '<UUID>' }, select: { id: true } }).execute()
db.appPermissionDefaultGrant.update({ where: { id: '<UUID>' }, data: { grantorId: '<UUID>' }, select: { id: true } }).execute()
db.appPermissionDefaultGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appPermissionDefaultGrant records

```typescript
const items = await db.appPermissionDefaultGrant.findMany({
  select: { id: true, grantorId: true }
}).execute();
```

### Create a appPermissionDefaultGrant

```typescript
const item = await db.appPermissionDefaultGrant.create({
  data: { grantorId: '<UUID>', isGrant: '<Boolean>', permissionId: '<UUID>' },
  select: { id: true }
}).execute();
```
