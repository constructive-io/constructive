---
name: orm-public-org-permission
description: Defines available permissions as named bits within a bitmask, used by the RBAC system for access control
---

# orm-public-org-permission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
db.orgPermission.findMany({ select: { id: true } }).execute()
db.orgPermission.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgPermission.create({ data: { name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' }, select: { id: true } }).execute()
db.orgPermission.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.orgPermission.delete({ where: { id: '<value>' } }).execute()
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
  data: { name: 'value', bitnum: 'value', bitstr: 'value', description: 'value' },
  select: { id: true }
}).execute();
```
