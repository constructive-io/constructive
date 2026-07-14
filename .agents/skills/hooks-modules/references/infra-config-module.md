# infraConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config module. Requires namespace_module and emits namespace:sync_config job triggers for K8s ConfigMap synchronization.

## Usage

```typescript
useInfraConfigModulesQuery({ selection: { fields: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useInfraConfigModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateInfraConfigModuleMutation({ selection: { fields: { id: true } } })
useUpdateInfraConfigModuleMutation({ selection: { fields: { id: true } } })
useDeleteInfraConfigModuleMutation({})
```

## Examples

### List all infraConfigModules

```typescript
const { data, isLoading } = useInfraConfigModulesQuery({
  selection: { fields: { apiName: true, configTableId: true, configTableName: true, databaseId: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a infraConfigModule

```typescript
const { mutate } = useCreateInfraConfigModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', configTableId: '<UUID>', configTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
