# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DenormalizedTableField records

## Usage

```typescript
db.denormalizedTableField.findMany({ select: { id: true } }).execute()
db.denormalizedTableField.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.denormalizedTableField.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', setIds: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', refIds: '<UUID>', useUpdates: '<Boolean>', updateDefaults: '<Boolean>', funcName: '<String>', funcOrder: '<Int>' }, select: { id: true } }).execute()
db.denormalizedTableField.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.denormalizedTableField.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all denormalizedTableField records

```typescript
const items = await db.denormalizedTableField.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a denormalizedTableField

```typescript
const item = await db.denormalizedTableField.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', setIds: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', refIds: '<UUID>', useUpdates: '<Boolean>', updateDefaults: '<Boolean>', funcName: '<String>', funcOrder: '<Int>' },
  select: { id: true }
}).execute();
```
