---
name: orm-public-app-permission-default
description: Stores the default permission bitmask assigned to new members upon joining
---

# orm-public-app-permission-default

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default permission bitmask assigned to new members upon joining

## Usage

```typescript
db.appPermissionDefault.findMany({ select: { id: true } }).execute()
db.appPermissionDefault.findOne({ id: '<value>', select: { id: true } }).execute()
db.appPermissionDefault.create({ data: { permissions: '<value>' }, select: { id: true } }).execute()
db.appPermissionDefault.update({ where: { id: '<value>' }, data: { permissions: '<new>' }, select: { id: true } }).execute()
db.appPermissionDefault.delete({ where: { id: '<value>' } }).execute()
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
  data: { permissions: 'value' },
  select: { id: true }
}).execute();
```
