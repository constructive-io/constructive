# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for HierarchyModule data operations

## Usage

```typescript
useHierarchyModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true, chartEdgesTableNameTrgmSimilarity: true, hierarchySprtTableNameTrgmSimilarity: true, chartEdgeGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, privateSchemaNameTrgmSimilarity: true, sprtTableNameTrgmSimilarity: true, rebuildHierarchyFunctionTrgmSimilarity: true, getSubordinatesFunctionTrgmSimilarity: true, getManagersFunctionTrgmSimilarity: true, isManagerOfFunctionTrgmSimilarity: true, searchScore: true } } })
useHierarchyModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true, chartEdgesTableNameTrgmSimilarity: true, hierarchySprtTableNameTrgmSimilarity: true, chartEdgeGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, privateSchemaNameTrgmSimilarity: true, sprtTableNameTrgmSimilarity: true, rebuildHierarchyFunctionTrgmSimilarity: true, getSubordinatesFunctionTrgmSimilarity: true, getManagersFunctionTrgmSimilarity: true, isManagerOfFunctionTrgmSimilarity: true, searchScore: true } } })
useCreateHierarchyModuleMutation({ selection: { fields: { id: true } } })
useUpdateHierarchyModuleMutation({ selection: { fields: { id: true } } })
useDeleteHierarchyModuleMutation({})
```

## Examples

### List all hierarchyModules

```typescript
const { data, isLoading } = useHierarchyModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, chartEdgesTableId: true, chartEdgesTableName: true, hierarchySprtTableId: true, hierarchySprtTableName: true, chartEdgeGrantsTableId: true, chartEdgeGrantsTableName: true, entityTableId: true, usersTableId: true, prefix: true, privateSchemaName: true, sprtTableName: true, rebuildHierarchyFunction: true, getSubordinatesFunction: true, getManagersFunction: true, isManagerOfFunction: true, createdAt: true, chartEdgesTableNameTrgmSimilarity: true, hierarchySprtTableNameTrgmSimilarity: true, chartEdgeGrantsTableNameTrgmSimilarity: true, prefixTrgmSimilarity: true, privateSchemaNameTrgmSimilarity: true, sprtTableNameTrgmSimilarity: true, rebuildHierarchyFunctionTrgmSimilarity: true, getSubordinatesFunctionTrgmSimilarity: true, getManagersFunctionTrgmSimilarity: true, isManagerOfFunctionTrgmSimilarity: true, searchScore: true } },
});
```

### Create a hierarchyModule

```typescript
const { mutate } = useCreateHierarchyModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', chartEdgesTableId: '<value>', chartEdgesTableName: '<value>', hierarchySprtTableId: '<value>', hierarchySprtTableName: '<value>', chartEdgeGrantsTableId: '<value>', chartEdgeGrantsTableName: '<value>', entityTableId: '<value>', usersTableId: '<value>', prefix: '<value>', privateSchemaName: '<value>', sprtTableName: '<value>', rebuildHierarchyFunction: '<value>', getSubordinatesFunction: '<value>', getManagersFunction: '<value>', isManagerOfFunction: '<value>', chartEdgesTableNameTrgmSimilarity: '<value>', hierarchySprtTableNameTrgmSimilarity: '<value>', chartEdgeGrantsTableNameTrgmSimilarity: '<value>', prefixTrgmSimilarity: '<value>', privateSchemaNameTrgmSimilarity: '<value>', sprtTableNameTrgmSimilarity: '<value>', rebuildHierarchyFunctionTrgmSimilarity: '<value>', getSubordinatesFunctionTrgmSimilarity: '<value>', getManagersFunctionTrgmSimilarity: '<value>', isManagerOfFunctionTrgmSimilarity: '<value>', searchScore: '<value>' });
```
