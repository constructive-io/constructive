---
name: orm-public-full-text-search
description: ORM operations for FullTextSearch records
---

# orm-public-full-text-search

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FullTextSearch records

## Usage

```typescript
db.fullTextSearch.findMany({ select: { id: true } }).execute()
db.fullTextSearch.findOne({ id: '<value>', select: { id: true } }).execute()
db.fullTextSearch.create({ data: { databaseId: '<value>', tableId: '<value>', fieldId: '<value>', fieldIds: '<value>', weights: '<value>', langs: '<value>' }, select: { id: true } }).execute()
db.fullTextSearch.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.fullTextSearch.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all fullTextSearch records

```typescript
const items = await db.fullTextSearch.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a fullTextSearch

```typescript
const item = await db.fullTextSearch.create({
  data: { databaseId: 'value', tableId: 'value', fieldId: 'value', fieldIds: 'value', weights: 'value', langs: 'value' },
  select: { id: true }
}).execute();
```
