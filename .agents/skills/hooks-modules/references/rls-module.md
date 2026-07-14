# rlsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RlsModule data operations

## Usage

```typescript
useRlsModulesQuery({ selection: { fields: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } } })
useRlsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } } })
useCreateRlsModuleMutation({ selection: { fields: { id: true } } })
useUpdateRlsModuleMutation({ selection: { fields: { id: true } } })
useDeleteRlsModuleMutation({})
```

## Examples

### List all rlsModules

```typescript
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { apiName: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true } },
});
```

### Create a rlsModule

```typescript
const { mutate } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', authenticate: '<String>', authenticateStrict: '<String>', currentRole: '<String>', currentRoleId: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', usersTableId: '<UUID>' });
```
