# routeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RouteModule data operations

## Usage

```typescript
useRouteModulesQuery({ selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainModuleId: true, entityField: true, entityTableId: true, hostnameBindingsTableId: true, hostnameBindingsTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, routeBindingsTableId: true, routeBindingsTableName: true, routesTableId: true, routesTableName: true, schemaId: true, scope: true } } })
useRouteModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainModuleId: true, entityField: true, entityTableId: true, hostnameBindingsTableId: true, hostnameBindingsTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, routeBindingsTableId: true, routeBindingsTableName: true, routesTableId: true, routesTableName: true, schemaId: true, scope: true } } })
useCreateRouteModuleMutation({ selection: { fields: { id: true } } })
useUpdateRouteModuleMutation({ selection: { fields: { id: true } } })
useDeleteRouteModuleMutation({})
```

## Examples

### List all routeModules

```typescript
const { data, isLoading } = useRouteModulesQuery({
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainModuleId: true, entityField: true, entityTableId: true, hostnameBindingsTableId: true, hostnameBindingsTableName: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, resolverFunctionName: true, routeBindingsTableId: true, routeBindingsTableName: true, routesTableId: true, routesTableName: true, schemaId: true, scope: true } },
});
```

### Create a routeModule

```typescript
const { mutate } = useCreateRouteModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainModuleId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', hostnameBindingsTableId: '<UUID>', hostnameBindingsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', routeBindingsTableId: '<UUID>', routeBindingsTableName: '<String>', routesTableId: '<UUID>', routesTableName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
