# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for HierarchyModule records

## Usage

```typescript
db.hierarchyModule.findMany({ select: { id: true } }).execute()
db.hierarchyModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.hierarchyModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>' }, select: { id: true } }).execute()
db.hierarchyModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.hierarchyModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all hierarchyModule records

```typescript
const items = await db.hierarchyModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a hierarchyModule

```typescript
const item = await db.hierarchyModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>' },
  select: { id: true }
}).execute();
```
