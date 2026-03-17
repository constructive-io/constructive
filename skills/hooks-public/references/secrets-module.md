# secretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SecretsModule data operations

## Usage

```typescript
useSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useSecretsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } } })
useCreateSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSecretsModuleMutation({})
```

## Examples

### List all secretsModules

```typescript
const { data, isLoading } = useSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, tableNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a secretsModule

```typescript
const { mutate } = useCreateSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
