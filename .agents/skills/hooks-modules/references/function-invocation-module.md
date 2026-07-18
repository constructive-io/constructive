# functionInvocationModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionInvocationModule data operations

## Usage

```typescript
useFunctionInvocationModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useFunctionInvocationModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateFunctionInvocationModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionInvocationModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionInvocationModuleMutation({})
```

## Examples

### List all functionInvocationModules

```typescript
const { data, isLoading } = useFunctionInvocationModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, executionLogsTableId: true, executionLogsTableName: true, id: true, invocationsTableId: true, invocationsTableName: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a functionInvocationModule

```typescript
const { mutate } = useCreateFunctionInvocationModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionLogsTableId: '<UUID>', executionLogsTableName: '<String>', invocationsTableId: '<UUID>', invocationsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
