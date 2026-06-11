# orgPermissionDefaultPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
db.orgPermissionDefaultPermission.findMany({ select: { id: true } }).execute()
db.orgPermissionDefaultPermission.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgPermissionDefaultPermission.create({ data: { permissionId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgPermissionDefaultPermission.update({ where: { id: '<UUID>' }, data: { permissionId: '<UUID>' }, select: { id: true } }).execute()
db.orgPermissionDefaultPermission.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgPermissionDefaultPermission records

```typescript
const items = await db.orgPermissionDefaultPermission.findMany({
  select: { id: true, permissionId: true }
}).execute();
```

### Create a orgPermissionDefaultPermission

```typescript
const item = await db.orgPermissionDefaultPermission.create({
  data: { permissionId: '<UUID>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
