# encryptedSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EncryptedSecretsModule data operations

## Usage

```typescript
useEncryptedSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useEncryptedSecretsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useCreateEncryptedSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEncryptedSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEncryptedSecretsModuleMutation({})
```

## Examples

### List all encryptedSecretsModules

```typescript
const { data, isLoading } = useEncryptedSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a encryptedSecretsModule

```typescript
const { mutate } = useCreateEncryptedSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
