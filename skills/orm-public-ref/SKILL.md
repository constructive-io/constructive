---
name: orm-public-ref
description: A ref is a data structure for pointing to a commit.
---

# orm-public-ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A ref is a data structure for pointing to a commit.

## Usage

```typescript
db.ref.findMany({ select: { id: true } }).execute()
db.ref.findOne({ id: '<value>', select: { id: true } }).execute()
db.ref.create({ data: { name: '<value>', databaseId: '<value>', storeId: '<value>', commitId: '<value>' }, select: { id: true } }).execute()
db.ref.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.ref.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all ref records

```typescript
const items = await db.ref.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a ref

```typescript
const item = await db.ref.create({
  data: { name: 'value', databaseId: 'value', storeId: 'value', commitId: 'value' },
  select: { id: true }
}).execute();
```
