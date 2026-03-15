# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CryptoAddressesModule data operations

## Usage

```typescript
useCryptoAddressesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, tableNameTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, searchScore: true } } })
useCryptoAddressesModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, tableNameTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, searchScore: true } } })
useCreateCryptoAddressesModuleMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAddressesModuleMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAddressesModuleMutation({})
```

## Examples

### List all cryptoAddressesModules

```typescript
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true, tableNameTrgmSimilarity: true, cryptoNetworkTrgmSimilarity: true, searchScore: true } },
});
```

### Create a cryptoAddressesModule

```typescript
const { mutate } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', cryptoNetwork: '<value>', tableNameTrgmSimilarity: '<value>', cryptoNetworkTrgmSimilarity: '<value>', searchScore: '<value>' });
```
