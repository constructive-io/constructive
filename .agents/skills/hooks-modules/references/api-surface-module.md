# apiSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ApiSurfaceModule data operations

## Usage

```typescript
useApiSurfaceModulesQuery({ selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useApiSurfaceModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateApiSurfaceModuleMutation({ selection: { fields: { id: true } } })
useUpdateApiSurfaceModuleMutation({ selection: { fields: { id: true } } })
useDeleteApiSurfaceModuleMutation({})
```

## Examples

### List all apiSurfaceModules

```typescript
const { data, isLoading } = useApiSurfaceModulesQuery({
  selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a apiSurfaceModule

```typescript
const { mutate } = useCreateApiSurfaceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
