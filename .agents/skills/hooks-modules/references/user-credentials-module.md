# userCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-user bcrypt credential store (password hashes, API key hashes).
     Always user-scoped with AuthzDirectOwner RLS. Consumed by user_auth_module,
     identity_providers_module, and bootstrap procedures.

## Usage

```typescript
useUserCredentialsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } } })
useUserCredentialsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } } })
useCreateUserCredentialsModuleMutation({ selection: { fields: { id: true } } })
useUpdateUserCredentialsModuleMutation({ selection: { fields: { id: true } } })
useDeleteUserCredentialsModuleMutation({})
```

## Examples

### List all userCredentialsModules

```typescript
const { data, isLoading } = useUserCredentialsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, apiName: true, privateApiName: true } },
});
```

### Create a userCredentialsModule

```typescript
const { mutate } = useCreateUserCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
