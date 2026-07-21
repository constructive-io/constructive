# graphModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GraphModule data operations

## Usage

```typescript
useGraphModulesQuery({ selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } } })
useGraphModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } } })
useCreateGraphModuleMutation({ selection: { fields: { id: true } } })
useUpdateGraphModuleMutation({ selection: { fields: { id: true } } })
useDeleteGraphModuleMutation({})
```

## Examples

### List all graphModules

```typescript
const { data, isLoading } = useGraphModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, graphsTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true } },
});
```

### Create a graphModule

```typescript
const { mutate } = useCreateGraphModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', graphsTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>' });
```
