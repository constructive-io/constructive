# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for HierarchyModule records

## Usage

```typescript
db.hierarchyModule.findMany({ select: { id: true } }).execute()
db.hierarchyModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.hierarchyModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', chartEdgesTableId: '<value>', chartEdgesTableName: '<value>', hierarchySprtTableId: '<value>', hierarchySprtTableName: '<value>', chartEdgeGrantsTableId: '<value>', chartEdgeGrantsTableName: '<value>', entityTableId: '<value>', usersTableId: '<value>', prefix: '<value>', privateSchemaName: '<value>', sprtTableName: '<value>', rebuildHierarchyFunction: '<value>', getSubordinatesFunction: '<value>', getManagersFunction: '<value>', isManagerOfFunction: '<value>' }, select: { id: true } }).execute()
db.hierarchyModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.hierarchyModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', chartEdgesTableId: 'value', chartEdgesTableName: 'value', hierarchySprtTableId: 'value', hierarchySprtTableName: 'value', chartEdgeGrantsTableId: 'value', chartEdgeGrantsTableName: 'value', entityTableId: 'value', usersTableId: 'value', prefix: 'value', privateSchemaName: 'value', sprtTableName: 'value', rebuildHierarchyFunction: 'value', getSubordinatesFunction: 'value', getManagersFunction: 'value', isManagerOfFunction: 'value' },
  select: { id: true }
}).execute();
```
