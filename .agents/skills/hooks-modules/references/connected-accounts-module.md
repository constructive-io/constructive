# connectedAccountsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ConnectedAccountsModule data operations

## Usage

```typescript
useConnectedAccountsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useConnectedAccountsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateConnectedAccountsModuleMutation({ selection: { fields: { id: true } } })
useUpdateConnectedAccountsModuleMutation({ selection: { fields: { id: true } } })
useDeleteConnectedAccountsModuleMutation({})
```

## Examples

### List all connectedAccountsModules

```typescript
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a connectedAccountsModule

```typescript
const { mutate } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
