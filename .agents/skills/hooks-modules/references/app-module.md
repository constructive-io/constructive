# appModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppModule data operations

## Usage

```typescript
useAppModulesQuery({ selection: { fields: { apiName: true, appComponentsTableId: true, appComponentsTableName: true, appsTableId: true, appsTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useAppModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, appComponentsTableId: true, appComponentsTableName: true, appsTableId: true, appsTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateAppModuleMutation({ selection: { fields: { id: true } } })
useUpdateAppModuleMutation({ selection: { fields: { id: true } } })
useDeleteAppModuleMutation({})
```

## Examples

### List all appModules

```typescript
const { data, isLoading } = useAppModulesQuery({
  selection: { fields: { apiName: true, appComponentsTableId: true, appComponentsTableName: true, appsTableId: true, appsTableName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a appModule

```typescript
const { mutate } = useCreateAppModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', appComponentsTableId: '<UUID>', appComponentsTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
