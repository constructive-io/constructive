# graphModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GraphModule data operations

## Usage

```typescript
useGraphModulesQuery({ selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, executionsTableId: true, execObjectTableId: true, apiName: true, scopeField: true, createdAt: true } } })
useGraphModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, executionsTableId: true, execObjectTableId: true, apiName: true, scopeField: true, createdAt: true } } })
useCreateGraphModuleMutation({ selection: { fields: { id: true } } })
useUpdateGraphModuleMutation({ selection: { fields: { id: true } } })
useDeleteGraphModuleMutation({})
```

## Examples

### List all graphModules

```typescript
const { data, isLoading } = useGraphModulesQuery({
  selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, prefix: true, merkleStoreModuleId: true, graphsTableId: true, executionsTableId: true, execObjectTableId: true, apiName: true, scopeField: true, createdAt: true } },
});
```

### Create a graphModule

```typescript
const { mutate } = useCreateGraphModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', graphsTableId: '<UUID>', executionsTableId: '<UUID>', execObjectTableId: '<UUID>', apiName: '<String>', scopeField: '<String>' });
```
