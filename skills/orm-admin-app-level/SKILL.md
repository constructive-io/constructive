---
name: orm-admin-app-level
description: Defines available levels that users can achieve by completing requirements
---

# orm-admin-app-level

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available levels that users can achieve by completing requirements

## Usage

```typescript
db.appLevel.findMany({ select: { id: true } }).execute()
db.appLevel.findOne({ id: '<value>', select: { id: true } }).execute()
db.appLevel.create({ data: { name: '<value>', description: '<value>', image: '<value>', ownerId: '<value>' }, select: { id: true } }).execute()
db.appLevel.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.appLevel.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appLevel records

```typescript
const items = await db.appLevel.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLevel

```typescript
const item = await db.appLevel.create({
  data: { name: 'value', description: 'value', image: 'value', ownerId: 'value' },
  select: { id: true }
}).execute();
```
