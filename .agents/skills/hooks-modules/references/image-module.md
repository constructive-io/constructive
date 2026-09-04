# imageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ImageModule data operations

## Usage

```typescript
useImageModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, id: true, imageGrantsTableId: true, imageGrantsTableName: true, imagesTableId: true, imagesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, registriesTableId: true, registriesTableName: true, registryGrantsTableId: true, registryGrantsTableName: true, schemaId: true, scope: true } } })
useImageModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, id: true, imageGrantsTableId: true, imageGrantsTableName: true, imagesTableId: true, imagesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, registriesTableId: true, registriesTableName: true, registryGrantsTableId: true, registryGrantsTableName: true, schemaId: true, scope: true } } })
useCreateImageModuleMutation({ selection: { fields: { id: true } } })
useUpdateImageModuleMutation({ selection: { fields: { id: true } } })
useDeleteImageModuleMutation({})
```

## Examples

### List all imageModules

```typescript
const { data, isLoading } = useImageModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, id: true, imageGrantsTableId: true, imageGrantsTableName: true, imagesTableId: true, imagesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, registriesTableId: true, registriesTableName: true, registryGrantsTableId: true, registryGrantsTableName: true, schemaId: true, scope: true } },
});
```

### Create a imageModule

```typescript
const { mutate } = useCreateImageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', imageGrantsTableId: '<UUID>', imageGrantsTableName: '<String>', imagesTableId: '<UUID>', imagesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', registriesTableId: '<UUID>', registriesTableName: '<String>', registryGrantsTableId: '<UUID>', registryGrantsTableName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
