# hooks-rlsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RlsModule data operations

## Usage

```typescript
useRlsModulesQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } } })
useRlsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } } })
useCreateRlsModuleMutation({ selection: { fields: { id: true } } })
useUpdateRlsModuleMutation({ selection: { fields: { id: true } } })
useDeleteRlsModuleMutation({})
```

## Examples

### List all rlsModules

```typescript
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true } },
});
```

### Create a rlsModule

```typescript
const { mutate } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', apiId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', sessionCredentialsTableId: '<value>', sessionsTableId: '<value>', usersTableId: '<value>', authenticate: '<value>', authenticateStrict: '<value>', currentRole: '<value>', currentRoleId: '<value>' });
```
