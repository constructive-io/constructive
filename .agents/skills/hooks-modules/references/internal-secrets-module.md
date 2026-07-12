# internalSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage.

## Usage

```typescript
useInternalSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, internalSecretsTableId: true, internalSecretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } } })
useInternalSecretsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, internalSecretsTableId: true, internalSecretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } } })
useCreateInternalSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateInternalSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteInternalSecretsModuleMutation({})
```

## Examples

### List all internalSecretsModules

```typescript
const { data, isLoading } = useInternalSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, internalSecretsTableId: true, internalSecretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } },
});
```

### Create a internalSecretsModule

```typescript
const { mutate } = useCreateInternalSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' });
```
