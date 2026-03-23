# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for HierarchyModule data operations

## Usage

```typescript
useHierarchyModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } } })
useHierarchyModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true } } })
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
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', entityTableId: '<UUID>', usersTableId: '<UUID>', prefix: '<String>', privateSchemaName: '<String>', sprtTableName: '<String>', rebuildHierarchyFunction: '<String>', getSubordinatesFunction: '<String>', getManagersFunction: '<String>', isManagerOfFunction: '<String>' });
```
