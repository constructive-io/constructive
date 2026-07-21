# httpRouteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for HttpRouteModule data operations

## Usage

```typescript
useHttpRouteModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } } })
useHttpRouteModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } } })
useCreateHttpRouteModuleMutation({ selection: { fields: { id: true } } })
useUpdateHttpRouteModuleMutation({ selection: { fields: { id: true } } })
useDeleteHttpRouteModuleMutation({})
```

## Examples

### List all httpRouteModules

```typescript
const { data, isLoading } = useHttpRouteModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, functionModuleId: true, httpRoutesTableId: true, httpRoutesTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, resourceModuleId: true, schemaId: true, scope: true, storageModuleId: true } },
});
```

### Create a httpRouteModule

```typescript
const { mutate } = useCreateHttpRouteModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', httpRoutesTableId: '<UUID>', httpRoutesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', resourceModuleId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storageModuleId: '<UUID>' });
```
