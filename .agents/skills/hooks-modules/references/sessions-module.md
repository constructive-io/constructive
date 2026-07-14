# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SessionsModule data operations

## Usage

```typescript
useSessionsModulesQuery({ selection: { fields: { authSettingsTable: true, authSettingsTableId: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTable: true, sessionCredentialsTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionsTableId: true, usersTableId: true } } })
useSessionsModuleQuery({ id: '<UUID>', selection: { fields: { authSettingsTable: true, authSettingsTableId: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTable: true, sessionCredentialsTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionsTableId: true, usersTableId: true } } })
useCreateSessionsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSessionsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSessionsModuleMutation({})
```

## Examples

### List all sessionsModules

```typescript
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { authSettingsTable: true, authSettingsTableId: true, databaseId: true, id: true, schemaId: true, sessionCredentialsTable: true, sessionCredentialsTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionsTableId: true, usersTableId: true } },
});
```

### Create a sessionsModule

```typescript
const { mutate } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ authSettingsTable: '<String>', authSettingsTableId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTable: '<String>', sessionCredentialsTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```
