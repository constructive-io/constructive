# resourceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourceModule data operations

## Usage

```typescript
useResourceModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } } })
useResourceModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } } })
useCreateResourceModuleMutation({ selection: { fields: { id: true } } })
useUpdateResourceModuleMutation({ selection: { fields: { id: true } } })
useDeleteResourceModuleMutation({})
```

## Examples

### List all resourceModules

```typescript
const { data, isLoading } = useResourceModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, installationStoreName: true, merkleStoreModuleId: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, requirementsStateViewName: true, resolvedRequirementsViewName: true, resourceBillingRollupFunction: true, resourceDefinitionsTableId: true, resourceDefinitionsTableName: true, resourceEventsTableId: true, resourceEventsTableName: true, resourceInstallationsTableId: true, resourceInstallationsTableName: true, resourceStatusChecksTableId: true, resourceStatusChecksTableName: true, resourceUsageLogTableId: true, resourceUsageLogTableName: true, resourceUsageSummaryTableId: true, resourceUsageSummaryTableName: true, resourcesTableId: true, resourcesTableName: true, rollupResourceUsageSummaryFunction: true, schemaId: true, scope: true } },
});
```

### Create a resourceModule

```typescript
const { mutate } = useCreateResourceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', installationStoreName: '<String>', merkleStoreModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', requirementsStateViewName: '<String>', resolvedRequirementsViewName: '<String>', resourceBillingRollupFunction: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceEventsTableId: '<UUID>', resourceEventsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourceStatusChecksTableId: '<UUID>', resourceStatusChecksTableName: '<String>', resourceUsageLogTableId: '<UUID>', resourceUsageLogTableName: '<String>', resourceUsageSummaryTableId: '<UUID>', resourceUsageSummaryTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', rollupResourceUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
