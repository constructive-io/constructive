# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CryptoAddressesModule data operations

## Usage

```typescript
useCryptoAddressesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } } })
useCryptoAddressesModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } } })
useCreateCryptoAddressesModuleMutation({ selection: { fields: { id: true } } })
useUpdateCryptoAddressesModuleMutation({ selection: { fields: { id: true } } })
useDeleteCryptoAddressesModuleMutation({})
```

## Examples

### List all cryptoAddressesModules

```typescript
const { data, isLoading } = useCryptoAddressesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, cryptoNetwork: true } },
});
```

### Create a cryptoAddressesModule

```typescript
const { mutate } = useCreateCryptoAddressesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>' });
```
