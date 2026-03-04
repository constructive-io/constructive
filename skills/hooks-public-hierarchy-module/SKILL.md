---
name: hooks-public-hierarchy-module
description: React Query hooks for HierarchyModule data operations
---

# hooks-public-hierarchy-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for HierarchyModule data operations

## Usage

```typescript
useHierarchyModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } } })
useHierarchyModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } } })
useCreateHierarchyModuleMutation({ selection: { fields: { id: true } } })
useUpdateHierarchyModuleMutation({ selection: { fields: { id: true } } })
useDeleteHierarchyModuleMutation({})
```

## Examples

### List all hierarchyModules

```typescript
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } },
});
```

### Create a hierarchyModule

```typescript
const { mutate } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', chartEdgesTableId: '<value>', chartEdgesTableName: '<value>', hierarchySprtTableId: '<value>', hierarchySprtTableName: '<value>', chartEdgeGrantsTableId: '<value>', chartEdgeGrantsTableName: '<value>', entityTableId: '<value>', usersTableId: '<value>', prefix: '<value>', privateSchemaName: '<value>', sprtTableName: '<value>', rebuildHierarchyFunction: '<value>', getSubordinatesFunction: '<value>', getManagersFunction: '<value>', isManagerOfFunction: '<value>' });
```
