# catalogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for CatalogModule data operations

## Usage

```typescript
useCatalogModulesQuery({ selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, appsTableId: true, appsTableName: true, databaseId: true, defaultPermissions: true, domainsTableId: true, domainsTableName: true, entityTableId: true, functionsTableId: true, functionsTableName: true, id: true, namespacesTableId: true, namespacesTableName: true, policies: true, privateApiName: true, provisions: true, publicSchemaName: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourcesTableId: true, resourcesTableName: true, schemaId: true, scope: true, sitesTableId: true, sitesTableName: true } } })
useCatalogModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, appsTableId: true, appsTableName: true, databaseId: true, defaultPermissions: true, domainsTableId: true, domainsTableName: true, entityTableId: true, functionsTableId: true, functionsTableName: true, id: true, namespacesTableId: true, namespacesTableName: true, policies: true, privateApiName: true, provisions: true, publicSchemaName: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourcesTableId: true, resourcesTableName: true, schemaId: true, scope: true, sitesTableId: true, sitesTableName: true } } })
useCreateCatalogModuleMutation({ selection: { fields: { id: true } } })
useUpdateCatalogModuleMutation({ selection: { fields: { id: true } } })
useDeleteCatalogModuleMutation({})
```

## Examples

### List all catalogModules

```typescript
const { data, isLoading } = useCatalogModulesQuery({
  selection: { fields: { apiName: true, apisTableId: true, apisTableName: true, appsTableId: true, appsTableName: true, databaseId: true, defaultPermissions: true, domainsTableId: true, domainsTableName: true, entityTableId: true, functionsTableId: true, functionsTableName: true, id: true, namespacesTableId: true, namespacesTableName: true, policies: true, privateApiName: true, provisions: true, publicSchemaName: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourcesTableId: true, resourcesTableName: true, schemaId: true, scope: true, sitesTableId: true, sitesTableName: true } },
});
```

### Create a catalogModule

```typescript
const { mutate } = useCreateCatalogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityTableId: '<UUID>', functionsTableId: '<UUID>', functionsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', schemaId: '<UUID>', scope: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>' });
```
