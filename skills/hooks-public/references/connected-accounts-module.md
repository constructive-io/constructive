# connectedAccountsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ConnectedAccountsModule data operations

## Usage

```typescript
useConnectedAccountsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useConnectedAccountsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useCreateConnectedAccountsModuleMutation({ selection: { fields: { id: true } } })
useUpdateConnectedAccountsModuleMutation({ selection: { fields: { id: true } } })
useDeleteConnectedAccountsModuleMutation({})
```

## Examples

### List all connectedAccountsModules

```typescript
const { data, isLoading } = useConnectedAccountsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a connectedAccountsModule

```typescript
const { mutate } = useCreateConnectedAccountsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
