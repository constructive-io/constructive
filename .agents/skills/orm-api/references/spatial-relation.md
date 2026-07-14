# spatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SpatialRelation records

## Usage

```typescript
db.spatialRelation.findMany({ select: { id: true } }).execute()
db.spatialRelation.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.spatialRelation.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', fieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', refFieldId: '<UUID>', refTableId: '<UUID>', tableId: '<UUID>', tags: '<String>' }, select: { id: true } }).execute()
db.spatialRelation.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.spatialRelation.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all spatialRelation records

```typescript
const items = await db.spatialRelation.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a spatialRelation

```typescript
const item = await db.spatialRelation.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', fieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', refFieldId: '<UUID>', refTableId: '<UUID>', tableId: '<UUID>', tags: '<String>' },
  select: { id: true }
}).execute();
```
