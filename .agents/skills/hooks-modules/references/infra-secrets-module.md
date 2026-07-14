# infraSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed PGP-encrypted key-value secrets module. Requires namespace_module and emits namespace:sync_secrets job triggers for K8s Secret synchronization.

## Usage

```typescript
useInfraSecretsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } } })
useInfraSecretsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } } })
useCreateInfraSecretsModuleMutation({ selection: { fields: { id: true } } })
useUpdateInfraSecretsModuleMutation({ selection: { fields: { id: true } } })
useDeleteInfraSecretsModuleMutation({})
```

## Examples

### List all infraSecretsModules

```typescript
const { data, isLoading } = useInfraSecretsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, secretsTableId: true, secretsTableName: true } },
});
```

### Create a infraSecretsModule

```typescript
const { mutate } = useCreateInfraSecretsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', secretsTableId: '<UUID>', secretsTableName: '<String>' });
```
