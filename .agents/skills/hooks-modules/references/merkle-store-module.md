# merkleStoreModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MerkleStoreModule data operations

## Usage

```typescript
useMerkleStoreModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, permissionKey: true, createdAt: true } } })
useMerkleStoreModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, permissionKey: true, createdAt: true } } })
useCreateMerkleStoreModuleMutation({ selection: { fields: { id: true } } })
useUpdateMerkleStoreModuleMutation({ selection: { fields: { id: true } } })
useDeleteMerkleStoreModuleMutation({})
```

## Examples

### List all merkleStoreModules

```typescript
const { data, isLoading } = useMerkleStoreModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, objectTableId: true, storeTableId: true, commitTableId: true, refTableId: true, prefix: true, apiName: true, privateApiName: true, scope: true, functionPrefix: true, permissionKey: true, createdAt: true } },
});
```

### Create a merkleStoreModule

```typescript
const { mutate } = useCreateMerkleStoreModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', objectTableId: '<UUID>', storeTableId: '<UUID>', commitTableId: '<UUID>', refTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', functionPrefix: '<String>', permissionKey: '<String>' });
```
