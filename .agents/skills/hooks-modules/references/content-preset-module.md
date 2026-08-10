# contentPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ContentPresetModule data operations

## Usage

```typescript
useContentPresetModulesQuery({ selection: { fields: { apiName: true, contentPresetsTableId: true, createdAt: true, databaseId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } } })
useContentPresetModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, contentPresetsTableId: true, createdAt: true, databaseId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } } })
useCreateContentPresetModuleMutation({ selection: { fields: { id: true } } })
useUpdateContentPresetModuleMutation({ selection: { fields: { id: true } } })
useDeleteContentPresetModuleMutation({})
```

## Examples

### List all contentPresetModules

```typescript
const { data, isLoading } = useContentPresetModulesQuery({
  selection: { fields: { apiName: true, contentPresetsTableId: true, createdAt: true, databaseId: true, entityTableId: true, id: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } },
});
```

### Create a contentPresetModule

```typescript
const { mutate } = useCreateContentPresetModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', contentPresetsTableId: '<UUID>', databaseId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' });
```
