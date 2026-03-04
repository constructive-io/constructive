---
name: orm-public-default-ids-module
description: ORM operations for DefaultIdsModule records
---

# orm-public-default-ids-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DefaultIdsModule records

## Usage

```typescript
db.defaultIdsModule.findMany({ select: { id: true } }).execute()
db.defaultIdsModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.defaultIdsModule.create({ data: { databaseId: '<value>' }, select: { id: true } }).execute()
db.defaultIdsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.defaultIdsModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all defaultIdsModule records

```typescript
const items = await db.defaultIdsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a defaultIdsModule

```typescript
const item = await db.defaultIdsModule.create({
  data: { databaseId: 'value' },
  select: { id: true }
}).execute();
```
