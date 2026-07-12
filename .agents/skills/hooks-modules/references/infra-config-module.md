# infraConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization.

## Usage

```typescript
useInfraConfigModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, configTableId: true, configTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true } } })
useInfraConfigModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, configTableId: true, configTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true } } })
useCreateInfraConfigModuleMutation({ selection: { fields: { id: true } } })
useUpdateInfraConfigModuleMutation({ selection: { fields: { id: true } } })
useDeleteInfraConfigModuleMutation({})
```

## Examples

### List all infraConfigModules

```typescript
const { data, isLoading } = useInfraConfigModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, configTableId: true, configTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true } },
});
```

### Create a infraConfigModule

```typescript
const { mutate } = useCreateInfraConfigModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', configTableId: '<UUID>', configTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' });
```
