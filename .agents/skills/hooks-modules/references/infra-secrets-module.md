# infraSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization.

## Usage

```typescript
useInfraSecretsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, secretsTableId: true, secretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } } })
useInfraSecretsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, secretsTableId: true, secretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } } })
useCreateInfraSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateInfraSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteInfraSecretsModuleMutation({})
```

## Examples

### List all infraSecretsModules

```typescript
const { data, isLoading } = useInfraSecretsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, secretsTableId: true, secretsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, entityField: true, policies: true, provisions: true } },
});
```

### Create a infraSecretsModule

```typescript
const { mutate } = useCreateInfraSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', entityField: '<String>', policies: '<JSON>', provisions: '<JSON>' });
```
