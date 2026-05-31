# spatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SpatialRelation records

## Usage

```typescript
db.spatialRelation.findMany({ select: { id: true } }).execute()
db.spatialRelation.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.spatialRelation.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.spatialRelation.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.spatialRelation.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all spatialRelation records

```typescript
const items = await db.spatialRelation.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a spatialRelation

```typescript
const item = await db.spatialRelation.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', refTableId: '<UUID>', refFieldId: '<UUID>', name: '<String>', operator: '<String>', paramName: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
