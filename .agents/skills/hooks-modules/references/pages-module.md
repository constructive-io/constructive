# pagesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PagesModule data operations

## Usage

```typescript
usePagesModulesQuery({ selection: { fields: { apiName: true, createdAt: true, databaseId: true, entityTableId: true, id: true, merkleStoreModuleId: true, pagesTableId: true, policies: true, prefix: true, previewCommitFunctionName: true, previewSetFunctionName: true, previewTokenMintFunctionName: true, previewTokenVerifierFunctionName: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, releaseManifestFunctionName: true, scope: true, siteSurfaceModuleId: true, sitesTableId: true, storeNamePrefix: true } } })
usePagesModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, createdAt: true, databaseId: true, entityTableId: true, id: true, merkleStoreModuleId: true, pagesTableId: true, policies: true, prefix: true, previewCommitFunctionName: true, previewSetFunctionName: true, previewTokenMintFunctionName: true, previewTokenVerifierFunctionName: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, releaseManifestFunctionName: true, scope: true, siteSurfaceModuleId: true, sitesTableId: true, storeNamePrefix: true } } })
useCreatePagesModuleMutation({ selection: { fields: { id: true } } })
useUpdatePagesModuleMutation({ selection: { fields: { id: true } } })
useDeletePagesModuleMutation({})
```

## Examples

### List all pagesModules

```typescript
const { data, isLoading } = usePagesModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, entityTableId: true, id: true, merkleStoreModuleId: true, pagesTableId: true, policies: true, prefix: true, previewCommitFunctionName: true, previewSetFunctionName: true, previewTokenMintFunctionName: true, previewTokenVerifierFunctionName: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, releaseManifestFunctionName: true, scope: true, siteSurfaceModuleId: true, sitesTableId: true, storeNamePrefix: true } },
});
```

### Create a pagesModule

```typescript
const { mutate } = useCreatePagesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', pagesTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', previewCommitFunctionName: '<String>', previewSetFunctionName: '<String>', previewTokenMintFunctionName: '<String>', previewTokenVerifierFunctionName: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', releaseManifestFunctionName: '<String>', scope: '<String>', siteSurfaceModuleId: '<UUID>', sitesTableId: '<UUID>', storeNamePrefix: '<String>' });
```
