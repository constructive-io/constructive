# namespaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NamespaceModule data operations

## Usage

```typescript
useNamespaceModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, platformNamespacesTableId: true, policies: true, provisions: true, defaultPermissions: true } } })
useNamespaceModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, platformNamespacesTableId: true, policies: true, provisions: true, defaultPermissions: true } } })
useCreateNamespaceModuleMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceModuleMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceModuleMutation({})
```

## Examples

### List all namespaceModules

```typescript
const { data, isLoading } = useNamespaceModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, namespacesTableId: true, namespaceEventsTableId: true, namespacesTableName: true, namespaceEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, platformNamespacesTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});
```

### Create a namespaceModule

```typescript
const { mutate } = useCreateNamespaceModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', namespacesTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespacesTableName: '<String>', namespaceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', platformNamespacesTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
