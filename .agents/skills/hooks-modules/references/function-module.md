# functionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FunctionModule data operations

## Usage

```typescript
useFunctionModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, invocationsTableId: true, executionLogsTableId: true, secretDefinitionsTableId: true, requirementsTableId: true, configDefinitionsTableId: true, configRequirementsTableId: true, definitionsTableName: true, invocationsTableName: true, executionLogsTableName: true, secretDefinitionsTableName: true, requirementsTableName: true, configRequirementsTableName: true, apiName: true, privateApiName: true, scope: true, databaseOwned: true, prefix: true, entityTableId: true, policies: true, provisions: true } } })
useFunctionModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, invocationsTableId: true, executionLogsTableId: true, secretDefinitionsTableId: true, requirementsTableId: true, configDefinitionsTableId: true, configRequirementsTableId: true, definitionsTableName: true, invocationsTableName: true, executionLogsTableName: true, secretDefinitionsTableName: true, requirementsTableName: true, configRequirementsTableName: true, apiName: true, privateApiName: true, scope: true, databaseOwned: true, prefix: true, entityTableId: true, policies: true, provisions: true } } })
useCreateFunctionModuleMutation({ selection: { fields: { id: true } } })
useUpdateFunctionModuleMutation({ selection: { fields: { id: true } } })
useDeleteFunctionModuleMutation({})
```

## Examples

### List all functionModules

```typescript
const { data, isLoading } = useFunctionModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, definitionsTableId: true, invocationsTableId: true, executionLogsTableId: true, secretDefinitionsTableId: true, requirementsTableId: true, configDefinitionsTableId: true, configRequirementsTableId: true, definitionsTableName: true, invocationsTableName: true, executionLogsTableName: true, secretDefinitionsTableName: true, requirementsTableName: true, configRequirementsTableName: true, apiName: true, privateApiName: true, scope: true, databaseOwned: true, prefix: true, entityTableId: true, policies: true, provisions: true } },
});
```

### Create a functionModule

```typescript
const { mutate } = useCreateFunctionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', definitionsTableId: '<UUID>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', secretDefinitionsTableId: '<UUID>', requirementsTableId: '<UUID>', configDefinitionsTableId: '<UUID>', configRequirementsTableId: '<UUID>', definitionsTableName: '<String>', invocationsTableName: '<String>', executionLogsTableName: '<String>', secretDefinitionsTableName: '<String>', requirementsTableName: '<String>', configRequirementsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', databaseOwned: '<Boolean>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' });
```
