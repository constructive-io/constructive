# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SessionsModule data operations

## Usage

```typescript
useSessionsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } } })
useSessionsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } } })
useCreateSessionsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSessionsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSessionsModuleMutation({})
```

## Examples

### List all sessionsModules

```typescript
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true } },
});
```

### Create a sessionsModule

```typescript
const { mutate } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', authSettingsTableId: '<UUID>', usersTableId: '<UUID>', sessionsDefaultExpiration: '<Interval>', sessionsTable: '<String>', sessionCredentialsTable: '<String>', authSettingsTable: '<String>' });
```
