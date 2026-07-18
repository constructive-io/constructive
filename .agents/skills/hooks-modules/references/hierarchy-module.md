# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for HierarchyModule data operations

## Usage

```typescript
useHierarchyModulesQuery({ selection: { fields: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } } })
useHierarchyModuleQuery({ id: '<UUID>', selection: { fields: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } } })
useCreateHierarchyModuleMutation({ selection: { fields: { id: true } } })
useUpdateHierarchyModuleMutation({ selection: { fields: { id: true } } })
useDeleteHierarchyModuleMutation({})
```

## Examples

### List all hierarchyModules

```typescript
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, chartEdgesTableId: true, chartEdgesTableName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, getManagersFunction: true, getSubordinatesFunction: true, hierarchySprtTableId: true, hierarchySprtTableName: true, id: true, isManagerOfFunction: true, prefix: true, privateSchemaId: true, privateSchemaName: true, rebuildHierarchyFunction: true, schemaId: true, scope: true, sprtTableName: true, usersTableId: true } },
});
```

### Create a hierarchyModule

```typescript
const { mutate } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ chartEdgeGrantsTableId: '<UUID>', chartEdgeGrantsTableName: '<String>', chartEdgesTableId: '<UUID>', chartEdgesTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', getManagersFunction: '<String>', getSubordinatesFunction: '<String>', hierarchySprtTableId: '<UUID>', hierarchySprtTableName: '<String>', isManagerOfFunction: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', rebuildHierarchyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableName: '<String>', usersTableId: '<UUID>' });
```
