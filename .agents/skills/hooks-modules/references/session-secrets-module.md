# sessionSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the session_secrets_module, which provisions a DB-private, session-scoped ephemeral key-value store for challenges, nonces, and one-time tokens that must never be readable by end users.

## Usage

```typescript
useSessionSecretsModulesQuery({ selection: { fields: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } } })
useSessionSecretsModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } } })
useCreateSessionSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSessionSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSessionSecretsModuleMutation({})
```

## Examples

### List all sessionSecretsModules

```typescript
const { data, isLoading } = useSessionSecretsModulesQuery({
  selection: { fields: { databaseId: true, id: true, schemaId: true, sessionsTableId: true, tableId: true, tableName: true } },
});
```

### Create a sessionSecretsModule

```typescript
const { mutate } = useCreateSessionSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
