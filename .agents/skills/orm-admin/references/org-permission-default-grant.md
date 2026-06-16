# orgPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of permission additions and removals from the defaults bitmask

## Usage

```typescript
db.orgPermissionDefaultGrant.findMany({ select: { id: true } }).execute()
db.orgPermissionDefaultGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgPermissionDefaultGrant.create({ data: { permissionId: '<UUID>', isGrant: '<Boolean>', grantorId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgPermissionDefaultGrant.update({ where: { id: '<UUID>' }, data: { permissionId: '<UUID>' }, select: { id: true } }).execute()
db.orgPermissionDefaultGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgPermissionDefaultGrant records

```typescript
const items = await db.orgPermissionDefaultGrant.findMany({
  select: { id: true, permissionId: true }
}).execute();
```

### Create a orgPermissionDefaultGrant

```typescript
const item = await db.orgPermissionDefaultGrant.create({
  data: { permissionId: '<UUID>', isGrant: '<Boolean>', grantorId: '<UUID>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
