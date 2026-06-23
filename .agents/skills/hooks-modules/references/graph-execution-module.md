# graphExecutionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GraphExecutionModule data operations

## Usage

```typescript
useGraphExecutionModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, graphModuleId: true, scope: true, prefix: true, executionsTableId: true, outputsTableId: true, nodeStatesTableId: true, executionsTableName: true, outputsTableName: true, nodeStatesTableName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } } })
useGraphExecutionModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, graphModuleId: true, scope: true, prefix: true, executionsTableId: true, outputsTableId: true, nodeStatesTableId: true, executionsTableName: true, outputsTableName: true, nodeStatesTableName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } } })
useCreateGraphExecutionModuleMutation({ selection: { fields: { id: true } } })
useUpdateGraphExecutionModuleMutation({ selection: { fields: { id: true } } })
useDeleteGraphExecutionModuleMutation({})
```

## Examples

### List all graphExecutionModules

```typescript
const { data, isLoading } = useGraphExecutionModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, graphModuleId: true, scope: true, prefix: true, executionsTableId: true, outputsTableId: true, nodeStatesTableId: true, executionsTableName: true, outputsTableName: true, nodeStatesTableName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true, createdAt: true } },
});
```

### Create a graphExecutionModule

```typescript
const { mutate } = useCreateGraphExecutionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', graphModuleId: '<UUID>', scope: '<String>', prefix: '<String>', executionsTableId: '<UUID>', outputsTableId: '<UUID>', nodeStatesTableId: '<UUID>', executionsTableName: '<String>', outputsTableName: '<String>', nodeStatesTableName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
