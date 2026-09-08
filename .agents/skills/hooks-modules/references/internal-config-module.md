# internalConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-aware plaintext internal config store. No namespace_module dependency and no K8s synchronization: values are read from the database at invocation time. Configuration that must be projected into a Kubernetes ConfigMap belongs in infra_config_module.

## Usage

```typescript
useInternalConfigModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalConfigTableId: true, internalConfigTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useInternalConfigModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalConfigTableId: true, internalConfigTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateInternalConfigModuleMutation({ selection: { fields: { id: true } } })
useUpdateInternalConfigModuleMutation({ selection: { fields: { id: true } } })
useDeleteInternalConfigModuleMutation({})
```

## Examples

### List all internalConfigModules

```typescript
const { data, isLoading } = useInternalConfigModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, entityTableId: true, id: true, internalConfigTableId: true, internalConfigTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a internalConfigModule

```typescript
const { mutate } = useCreateInternalConfigModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', internalConfigTableId: '<UUID>', internalConfigTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
