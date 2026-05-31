# viewTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Junction table linking views to their joined tables for referential integrity

## Usage

```typescript
db.viewTable.findMany({ select: { id: true } }).execute()
db.viewTable.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.viewTable.create({ data: { viewId: '<UUID>', tableId: '<UUID>', joinOrder: '<Int>' }, select: { id: true } }).execute()
db.viewTable.update({ where: { id: '<UUID>' }, data: { viewId: '<UUID>' }, select: { id: true } }).execute()
db.viewTable.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { viewId: '<UUID>', tableId: '<UUID>', joinOrder: '<Int>' },
  select: { id: true }
}).execute();
```
