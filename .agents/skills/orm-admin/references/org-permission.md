# orgPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
db.orgPermission.findMany({ select: { id: true } }).execute()
db.orgPermission.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgPermission.create({ data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' }, select: { id: true } }).execute()
db.orgPermission.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.orgPermission.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgPermission records

```typescript
const items = await db.orgPermission.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a orgPermission

```typescript
const item = await db.orgPermission.create({
  data: { name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' },
  select: { id: true }
}).execute();
```
