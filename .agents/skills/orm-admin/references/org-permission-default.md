# orgPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default permission bitmask assigned to new members upon joining

## Usage

```typescript
db.orgPermissionDefault.findMany({ select: { id: true } }).execute()
db.orgPermissionDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgPermissionDefault.create({ data: { entityId: '<UUID>', permissions: '<BitString>' }, select: { id: true } }).execute()
db.orgPermissionDefault.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgPermissionDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgPermissionDefault records

```typescript
const items = await db.orgPermissionDefault.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgPermissionDefault

```typescript
const item = await db.orgPermissionDefault.create({
  data: { entityId: '<UUID>', permissions: '<BitString>' },
  select: { id: true }
}).execute();
```
