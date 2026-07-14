# functionDeploymentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionDeploymentModule data operations

## Usage

```typescript
useFunctionDeploymentModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useFunctionDeploymentModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateFunctionDeploymentModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDeploymentModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDeploymentModuleMutation({})
```

## Examples

### List all functionDeploymentModules

```typescript
const { data, isLoading } = useFunctionDeploymentModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, deploymentEventsTableId: true, deploymentEventsTableName: true, deploymentsTableId: true, deploymentsTableName: true, entityField: true, entityTableId: true, functionModuleId: true, id: true, namespaceModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a functionDeploymentModule

```typescript
const { mutate } = useCreateFunctionDeploymentModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', deploymentEventsTableId: '<UUID>', deploymentEventsTableName: '<String>', deploymentsTableId: '<UUID>', deploymentsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
