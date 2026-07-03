# resourceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourceModule data operations

## Usage

```typescript
useResourceModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourcesTableName: true, resourceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } } })
useResourceModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourcesTableName: true, resourceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } } })
useCreateResourceModuleMutation({ selection: { fields: { id: true } } })
useUpdateResourceModuleMutation({ selection: { fields: { id: true } } })
useDeleteResourceModuleMutation({})
```

## Examples

### List all resourceModules

```typescript
const { data, isLoading } = useResourceModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, resourcesTableId: true, resourceEventsTableId: true, resourcesTableName: true, resourceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});
```

### Create a resourceModule

```typescript
const { mutate } = useCreateResourceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', resourcesTableId: '<UUID>', resourceEventsTableId: '<UUID>', resourcesTableName: '<String>', resourceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
