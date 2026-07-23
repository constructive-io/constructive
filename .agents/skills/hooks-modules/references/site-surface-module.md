# siteSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SiteSurfaceModule data operations

## Usage

```typescript
useSiteSurfaceModulesQuery({ selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteMetadataTableId: true, siteMetadataTableName: true, siteModulesTableId: true, siteModulesTableName: true, siteThemesTableId: true, siteThemesTableName: true, sitesTableId: true, sitesTableName: true } } })
useSiteSurfaceModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteMetadataTableId: true, siteMetadataTableName: true, siteModulesTableId: true, siteModulesTableName: true, siteThemesTableId: true, siteThemesTableName: true, sitesTableId: true, sitesTableName: true } } })
useCreateSiteSurfaceModuleMutation({ selection: { fields: { id: true } } })
useUpdateSiteSurfaceModuleMutation({ selection: { fields: { id: true } } })
useDeleteSiteSurfaceModuleMutation({})
```

## Examples

### List all siteSurfaceModules

```typescript
const { data, isLoading } = useSiteSurfaceModulesQuery({
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteMetadataTableId: true, siteMetadataTableName: true, siteModulesTableId: true, siteModulesTableName: true, siteThemesTableId: true, siteThemesTableName: true, sitesTableId: true, sitesTableName: true } },
});
```

### Create a siteSurfaceModule

```typescript
const { mutate } = useCreateSiteSurfaceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteMetadataTableId: '<UUID>', siteMetadataTableName: '<String>', siteModulesTableId: '<UUID>', siteModulesTableName: '<String>', siteThemesTableId: '<UUID>', siteThemesTableName: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>' });
```
