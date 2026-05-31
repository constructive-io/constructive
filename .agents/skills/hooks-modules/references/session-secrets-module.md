# sessionSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users.

## Usage

```typescript
useSessionSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } } })
useSessionSecretsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } } })
useCreateSessionSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSessionSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSessionSecretsModuleMutation({})
```

## Examples

### List all sessionSecretsModules

```typescript
const { data, isLoading } = useSessionSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, sessionsTableId: true } },
});
```

### Create a sessionSecretsModule

```typescript
const { mutate } = useCreateSessionSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', sessionsTableId: '<UUID>' });
```
