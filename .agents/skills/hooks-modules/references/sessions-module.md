# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SessionsModule data operations

## Usage

```typescript
useSessionsModulesQuery({ selection: { fields: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } } })
useSessionsModuleQuery({ id: '<UUID>', selection: { fields: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } } })
useCreateSessionsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSessionsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSessionsModuleMutation({})
```

## Examples

### List all sessionsModules

```typescript
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { authSettingsTableId: true, authSettingsTableName: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTableId: true, sessionCredentialsTableName: true, sessionsDefaultExpiration: true, sessionsTableId: true, sessionsTableName: true, usersTableId: true } },
});
```

### Create a sessionsModule

```typescript
const { mutate } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ authSettingsTableId: '<UUID>', authSettingsTableName: '<String>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionCredentialsTableName: '<String>', sessionsDefaultExpiration: '<Interval>', sessionsTableId: '<UUID>', sessionsTableName: '<String>', usersTableId: '<UUID>' });
```
