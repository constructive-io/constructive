# appPermissionDefaultPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
db.appPermissionDefaultPermission.findMany({ select: { id: true } }).execute()
db.appPermissionDefaultPermission.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appPermissionDefaultPermission.create({ data: { permissionId: '<UUID>' }, select: { id: true } }).execute()
db.appPermissionDefaultPermission.update({ where: { id: '<UUID>' }, data: { permissionId: '<UUID>' }, select: { id: true } }).execute()
db.appPermissionDefaultPermission.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appPermissionDefaultPermission records

```typescript
const items = await db.appPermissionDefaultPermission.findMany({
  select: { id: true, permissionId: true }
}).execute();
```

### Create a appPermissionDefaultPermission

```typescript
const item = await db.appPermissionDefaultPermission.create({
  data: { permissionId: '<UUID>' },
  select: { id: true }
}).execute();
```
