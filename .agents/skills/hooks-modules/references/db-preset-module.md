# dbPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DbPresetModule data operations

## Usage

```typescript
useDbPresetModulesQuery({ selection: { fields: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } } })
useDbPresetModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } } })
useCreateDbPresetModuleMutation({ selection: { fields: { id: true } } })
useUpdateDbPresetModuleMutation({ selection: { fields: { id: true } } })
useDeleteDbPresetModuleMutation({})
```

## Examples

### List all dbPresetModules

```typescript
const { data, isLoading } = useDbPresetModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, dbPresetsTableId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } },
});
```

### Create a dbPresetModule

```typescript
const { mutate } = useCreateDbPresetModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', dbPresetsTableId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' });
```
