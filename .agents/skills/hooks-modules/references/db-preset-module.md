# dbPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DbPresetModule data operations

## Usage

```typescript
useDbPresetModulesQuery({ selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, dbPresetsTableId: true, storeName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, createdAt: true } } })
useDbPresetModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, dbPresetsTableId: true, storeName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, createdAt: true } } })
useCreateDbPresetModuleMutation({ selection: { fields: { id: true } } })
useUpdateDbPresetModuleMutation({ selection: { fields: { id: true } } })
useDeleteDbPresetModuleMutation({})
```

## Examples

### List all dbPresetModules

```typescript
const { data, isLoading } = useDbPresetModulesQuery({
  selection: { fields: { id: true, databaseId: true, publicSchemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, scope: true, prefix: true, merkleStoreModuleId: true, dbPresetsTableId: true, storeName: true, apiName: true, privateApiName: true, entityTableId: true, policies: true, provisions: true, createdAt: true } },
});
```

### Create a dbPresetModule

```typescript
const { mutate } = useCreateDbPresetModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', publicSchemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', scope: '<String>', prefix: '<String>', merkleStoreModuleId: '<UUID>', dbPresetsTableId: '<UUID>', storeName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' });
```
