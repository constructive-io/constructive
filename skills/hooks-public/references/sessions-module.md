# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SessionsModule data operations

## Usage

```typescript
useSessionsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true, sessionsTableTrgmSimilarity: true, sessionCredentialsTableTrgmSimilarity: true, authSettingsTableTrgmSimilarity: true, searchScore: true } } })
useSessionsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true, sessionsTableTrgmSimilarity: true, sessionCredentialsTableTrgmSimilarity: true, authSettingsTableTrgmSimilarity: true, searchScore: true } } })
useCreateSessionsModuleMutation({ selection: { fields: { id: true } } })
useUpdateSessionsModuleMutation({ selection: { fields: { id: true } } })
useDeleteSessionsModuleMutation({})
```

## Examples

### List all sessionsModules

```typescript
const { data, isLoading } = useSessionsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, sessionsTableId: true, sessionCredentialsTableId: true, authSettingsTableId: true, usersTableId: true, sessionsDefaultExpiration: true, sessionsTable: true, sessionCredentialsTable: true, authSettingsTable: true, sessionsTableTrgmSimilarity: true, sessionCredentialsTableTrgmSimilarity: true, authSettingsTableTrgmSimilarity: true, searchScore: true } },
});
```

### Create a sessionsModule

```typescript
const { mutate } = useCreateSessionsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', sessionsTableId: '<value>', sessionCredentialsTableId: '<value>', authSettingsTableId: '<value>', usersTableId: '<value>', sessionsDefaultExpiration: '<value>', sessionsTable: '<value>', sessionCredentialsTable: '<value>', authSettingsTable: '<value>', sessionsTableTrgmSimilarity: '<value>', sessionCredentialsTableTrgmSimilarity: '<value>', authSettingsTableTrgmSimilarity: '<value>', searchScore: '<value>' });
```
