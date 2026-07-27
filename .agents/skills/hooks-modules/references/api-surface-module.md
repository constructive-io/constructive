# apiSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ApiSurfaceModule data operations

## Usage

```typescript
useApiSurfaceModulesQuery({ selection: { fields: { apiModulesTableId: true, apiModulesTableName: true, apiName: true, apiSchemasTableId: true, apiSchemasTableName: true, apiSettingsTableId: true, apiSettingsTableName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, corsSettingsTableId: true, corsSettingsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useApiSurfaceModuleQuery({ id: '<UUID>', selection: { fields: { apiModulesTableId: true, apiModulesTableName: true, apiName: true, apiSchemasTableId: true, apiSchemasTableName: true, apiSettingsTableId: true, apiSettingsTableName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, corsSettingsTableId: true, corsSettingsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateApiSurfaceModuleMutation({ selection: { fields: { id: true } } })
useUpdateApiSurfaceModuleMutation({ selection: { fields: { id: true } } })
useDeleteApiSurfaceModuleMutation({})
```

## Examples

### List all apiSurfaceModules

```typescript
const { data, isLoading } = useApiSurfaceModulesQuery({
  selection: { fields: { apiModulesTableId: true, apiModulesTableName: true, apiName: true, apiSchemasTableId: true, apiSchemasTableName: true, apiSettingsTableId: true, apiSettingsTableName: true, apisTableId: true, apisTableName: true, catalogModuleId: true, corsSettingsTableId: true, corsSettingsTableName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a apiSurfaceModule

```typescript
const { mutate } = useCreateApiSurfaceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiModulesTableId: '<UUID>', apiModulesTableName: '<String>', apiName: '<String>', apiSchemasTableId: '<UUID>', apiSchemasTableName: '<String>', apiSettingsTableId: '<UUID>', apiSettingsTableName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', catalogModuleId: '<UUID>', corsSettingsTableId: '<UUID>', corsSettingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
