# functionDeploymentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionDeploymentModule data operations

## Usage

```typescript
useFunctionDeploymentModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, deploymentsTableId: true, deploymentEventsTableId: true, deploymentsTableName: true, deploymentEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, functionModuleId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } } })
useFunctionDeploymentModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, deploymentsTableId: true, deploymentEventsTableId: true, deploymentsTableName: true, deploymentEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, functionModuleId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } } })
useCreateFunctionDeploymentModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDeploymentModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDeploymentModuleMutation({})
```

## Examples

### List all functionDeploymentModules

```typescript
const { data, isLoading } = useFunctionDeploymentModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, deploymentsTableId: true, deploymentEventsTableId: true, deploymentsTableName: true, deploymentEventsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, functionModuleId: true, namespaceModuleId: true, policies: true, provisions: true, defaultPermissions: true } },
});
```

### Create a functionDeploymentModule

```typescript
const { mutate } = useCreateFunctionDeploymentModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', deploymentsTableId: '<UUID>', deploymentEventsTableId: '<UUID>', deploymentsTableName: '<String>', deploymentEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
