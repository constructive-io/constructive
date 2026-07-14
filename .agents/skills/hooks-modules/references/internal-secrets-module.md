# internalSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App-scoped PGP-encrypted internal secrets store. No namespace_module dependency and no K8s synchronization. Used by identity_providers_module for OAuth2 client_secret storage.

## Usage

```typescript
useInternalSecretsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useInternalSecretsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateInternalSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateInternalSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteInternalSecretsModuleMutation({})
```

## Examples

### List all internalSecretsModules

```typescript
const { data, isLoading } = useInternalSecretsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalSecretsTableId: true, internalSecretsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a internalSecretsModule

```typescript
const { mutate } = useCreateInternalSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalSecretsTableId: '<UUID>', internalSecretsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
