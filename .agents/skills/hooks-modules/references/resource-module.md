# resourceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourceModule data operations

## Usage

```typescript
useResourceModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourceStatusChecksTableId: true, resourceDefinitionsTableId: true, resourcesTableName: true, resourceEventsTableName: true, resourceStatusChecksTableName: true, resourceDefinitionsTableName: true, resolvedRequirementsViewName: true, requirementsStateViewName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } } })
useResourceModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourceStatusChecksTableId: true, resourceDefinitionsTableId: true, resourcesTableName: true, resourceEventsTableName: true, resourceStatusChecksTableName: true, resourceDefinitionsTableName: true, resolvedRequirementsViewName: true, requirementsStateViewName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } } })
useCreateResourceModuleMutation({ selection: { fields: { id: true } } })
useUpdateResourceModuleMutation({ selection: { fields: { id: true } } })
useDeleteResourceModuleMutation({})
```

## Examples

### List all resourceModules

```typescript
const { data, isLoading } = useResourceModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourceStatusChecksTableId: true, resourceDefinitionsTableId: true, resourcesTableName: true, resourceEventsTableName: true, resourceStatusChecksTableName: true, resourceDefinitionsTableName: true, resolvedRequirementsViewName: true, requirementsStateViewName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});
```

### Create a resourceModule

```typescript
const { mutate } = useCreateResourceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', resourcesTableId: '<UUID>', resourceEventsTableId: '<UUID>', resourceStatusChecksTableId: '<UUID>', resourceDefinitionsTableId: '<UUID>', resourcesTableName: '<String>', resourceEventsTableName: '<String>', resourceStatusChecksTableName: '<String>', resourceDefinitionsTableName: '<String>', resolvedRequirementsViewName: '<String>', requirementsStateViewName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
