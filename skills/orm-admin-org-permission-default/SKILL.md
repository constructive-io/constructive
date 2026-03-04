---
name: orm-admin-org-permission-default
description: Stores the default permission bitmask assigned to new members upon joining
---

# orm-admin-org-permission-default

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default permission bitmask assigned to new members upon joining

## Usage

```typescript
db.orgPermissionDefault.findMany({ select: { id: true } }).execute()
db.orgPermissionDefault.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgPermissionDefault.create({ data: { permissions: '<value>', entityId: '<value>' }, select: { id: true } }).execute()
db.orgPermissionDefault.update({ where: { id: '<value>' }, data: { permissions: '<new>' }, select: { id: true } }).execute()
db.orgPermissionDefault.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgPermissionDefault records

```typescript
const items = await db.orgPermissionDefault.findMany({
  select: { id: true, permissions: true }
}).execute();
```

### Create a orgPermissionDefault

```typescript
const item = await db.orgPermissionDefault.create({
  data: { permissions: 'value', entityId: 'value' },
  select: { id: true }
}).execute();
```
