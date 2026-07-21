# graphExecutionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GraphExecutionModule data operations

## Usage

```typescript
useGraphExecutionModulesQuery({ selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useGraphExecutionModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateGraphExecutionModuleMutation({ selection: { fields: { id: true } } })
useUpdateGraphExecutionModuleMutation({ selection: { fields: { id: true } } })
useDeleteGraphExecutionModuleMutation({})
```

## Examples

### List all graphExecutionModules

```typescript
const { data, isLoading } = useGraphExecutionModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionsTableId: true, executionsTableName: true, graphModuleId: true, id: true, nodeStatesTableId: true, nodeStatesTableName: true, outputsTableId: true, outputsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a graphExecutionModule

```typescript
const { mutate } = useCreateGraphExecutionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionsTableId: '<UUID>', executionsTableName: '<String>', graphModuleId: '<UUID>', nodeStatesTableId: '<UUID>', nodeStatesTableName: '<String>', outputsTableId: '<UUID>', outputsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
