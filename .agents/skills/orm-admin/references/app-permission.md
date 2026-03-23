# appPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
db.appPermission.findMany({ select: { id: true } }).execute()
db.appPermission.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appPermission.create({ data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' }, select: { id: true } }).execute()
db.appPermission.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.appPermission.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appPermission records

```typescript
const items = await db.appPermission.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appPermission

```typescript
const item = await db.appPermission.create({
  data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' },
  select: { id: true }
}).execute();
```
