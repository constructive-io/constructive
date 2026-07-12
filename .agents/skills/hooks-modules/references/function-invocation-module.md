# functionInvocationModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionInvocationModule data operations

## Usage

```typescript
useFunctionInvocationModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } } })
useFunctionInvocationModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } } })
useCreateFunctionInvocationModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionInvocationModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionInvocationModuleMutation({})
```

## Examples

### List all functionInvocationModules

```typescript
const { data, isLoading } = useFunctionInvocationModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, invocationsTableId: true, executionLogsTableId: true, invocationsTableName: true, executionLogsTableName: true, apiName: true, privateApiName: true, scope: true, prefix: true, entityTableId: true, policies: true, provisions: true, defaultPermissions: true } },
});
```

### Create a functionInvocationModule

```typescript
const { mutate } = useCreateFunctionInvocationModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', invocationsTableName: '<String>', executionLogsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' });
```
