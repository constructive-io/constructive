# appPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default permission bitmask assigned to new members upon joining

## Usage

```typescript
db.appPermissionDefault.findMany({ select: { id: true } }).execute()
db.appPermissionDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appPermissionDefault.create({ data: { permissions: '<BitString>' }, select: { id: true } }).execute()
db.appPermissionDefault.update({ where: { id: '<UUID>' }, data: { permissions: '<BitString>' }, select: { id: true } }).execute()
db.appPermissionDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appPermissionDefault records

```typescript
const items = await db.appPermissionDefault.findMany({
  select: { id: true, permissions: true }
}).execute();
```

### Create a appPermissionDefault

```typescript
const item = await db.appPermissionDefault.create({
  data: { permissions: '<BitString>' },
  select: { id: true }
}).execute();
```
