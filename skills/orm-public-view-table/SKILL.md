---
name: orm-public-view-table
description: Junction table linking views to their joined tables for referential integrity
---

# orm-public-view-table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Junction table linking views to their joined tables for referential integrity

## Usage

```typescript
db.viewTable.findMany({ select: { id: true } }).execute()
db.viewTable.findOne({ id: '<value>', select: { id: true } }).execute()
db.viewTable.create({ data: { viewId: '<value>', tableId: '<value>', joinOrder: '<value>' }, select: { id: true } }).execute()
db.viewTable.update({ where: { id: '<value>' }, data: { viewId: '<new>' }, select: { id: true } }).execute()
db.viewTable.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all viewTable records

```typescript
const items = await db.viewTable.findMany({
  select: { id: true, viewId: true }
}).execute();
```

### Create a viewTable

```typescript
const item = await db.viewTable.create({
  data: { viewId: 'value', tableId: 'value', joinOrder: 'value' },
  select: { id: true }
}).execute();
```
