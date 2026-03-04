---
name: hooks-public-secrets-module
description: React Query hooks for SecretsModule data operations
---

# hooks-public-secrets-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SecretsModule data operations

## Usage

```typescript
useSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useSecretsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSecretsModuleMutation({})
```

## Examples

### List all secretsModules

```typescript
const { data, isLoading } = useSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a secretsModule

```typescript
const { mutate } = useCreateSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' });
```
