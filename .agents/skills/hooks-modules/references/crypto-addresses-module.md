# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CryptoAddressesModule data operations

## Usage

```typescript
useCryptoAddressesModulesQuery({ selection: { fields: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useCryptoAddressesModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateCryptoAddressesModuleMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAddressesModuleMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAddressesModuleMutation({})
```

## Examples

### List all cryptoAddressesModules

```typescript
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { apiName: true, cryptoNetwork: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a cryptoAddressesModule

```typescript
const { mutate } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', cryptoNetwork: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
