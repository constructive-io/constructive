# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for HierarchyModule records

## Usage

```typescript
db.hierarchyModule.findMany({ select: { id: true } }).execute()
db.hierarchyModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.hierarchyModule.create({ data: { chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', getManagersFunction: '<String>', getSubordinatesFunction: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', isManagerOfFunction: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', rebuildHierarchyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableName: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.hierarchyModule.update({ where: { id: '<UUID>' }, data: { chartEdgeGrantsTableId: '<UUID>' }, select: { id: true } }).execute()
db.hierarchyModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all hierarchyModule records

```typescript
const items = await db.hierarchyModule.findMany({
  select: { id: true, chartEdgeGrantsTableId: true }
}).execute();
```

### Create a hierarchyModule

```typescript
const item = await db.hierarchyModule.create({
  data: { chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', getManagersFunction: '<String>', getSubordinatesFunction: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', isManagerOfFunction: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', rebuildHierarchyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableName: '<String>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
