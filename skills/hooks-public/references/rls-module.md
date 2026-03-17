# rlsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RlsModule data operations

## Usage

```typescript
useRlsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, authenticateTrgmSimilarity: true, authenticateStrictTrgmSimilarity: true, currentRoleTrgmSimilarity: true, currentRoleIdTrgmSimilarity: true, searchScore: true } } })
useRlsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, authenticateTrgmSimilarity: true, authenticateStrictTrgmSimilarity: true, currentRoleTrgmSimilarity: true, currentRoleIdTrgmSimilarity: true, searchScore: true } } })
useCreateRlsModuleMutation({ selection: { fields: { id: true } } })
useUpdateRlsModuleMutation({ selection: { fields: { id: true } } })
useDeleteRlsModuleMutation({})
```

## Examples

### List all rlsModules

```typescript
const { data, isLoading } = useRlsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, sessionCredentialsTableId: true, sessionsTableId: true, usersTableId: true, authenticate: true, authenticateStrict: true, currentRole: true, currentRoleId: true, authenticateTrgmSimilarity: true, authenticateStrictTrgmSimilarity: true, currentRoleTrgmSimilarity: true, currentRoleIdTrgmSimilarity: true, searchScore: true } },
});
```

### Create a rlsModule

```typescript
const { mutate } = useCreateRlsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', sessionCredentialsTableId: '<value>', sessionsTableId: '<value>', usersTableId: '<value>', authenticate: '<value>', authenticateStrict: '<value>', currentRole: '<value>', currentRoleId: '<value>', authenticateTrgmSimilarity: '<value>', authenticateStrictTrgmSimilarity: '<value>', currentRoleTrgmSimilarity: '<value>', currentRoleIdTrgmSimilarity: '<value>', searchScore: '<value>' });
```
