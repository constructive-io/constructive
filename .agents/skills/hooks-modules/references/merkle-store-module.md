# merkleStoreModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MerkleStoreModule data operations

## Usage

```typescript
useMerkleStoreModulesQuery({ selection: { fields: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } } })
useMerkleStoreModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } } })
useCreateMerkleStoreModuleMutation({ selection: { fields: { id: true } } })
useUpdateMerkleStoreModuleMutation({ selection: { fields: { id: true } } })
useDeleteMerkleStoreModuleMutation({})
```

## Examples

### List all merkleStoreModules

```typescript
const { data, isLoading } = useMerkleStoreModulesQuery({
  selection: { fields: { apiName: true, commitTableId: true, createdAt: true, databaseId: true, entityField: true, functionPrefix: true, id: true, objectTableId: true, permissionKey: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, refTableId: true, schemaId: true, scope: true, storeTableId: true } },
});
```

### Create a merkleStoreModule

```typescript
const { mutate } = useCreateMerkleStoreModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', commitTableId: '<UUID>', databaseId: '<UUID>', entityField: '<String>', functionPrefix: '<String>', objectTableId: '<UUID>', permissionKey: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', refTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storeTableId: '<UUID>' });
```
