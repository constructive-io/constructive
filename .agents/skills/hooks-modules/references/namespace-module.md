# namespaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NamespaceModule data operations

## Usage

```typescript
useNamespaceModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useNamespaceModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateNamespaceModuleMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceModuleMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceModuleMutation({})
```

## Examples

### List all namespaceModules

```typescript
const { data, isLoading } = useNamespaceModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, id: true, namespaceEventsTableId: true, namespaceEventsTableName: true, namespacesTableId: true, namespacesTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a namespaceModule

```typescript
const { mutate } = useCreateNamespaceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespaceEventsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
