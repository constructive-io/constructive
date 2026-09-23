# computeLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ComputeLogModule data operations

## Usage

```typescript
useComputeLogModulesQuery({ selection: { fields: { apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useComputeLogModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useCreateComputeLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateComputeLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteComputeLogModuleMutation({})
```

## Examples

### List all computeLogModules

```typescript
const { data, isLoading } = useComputeLogModulesQuery({
  selection: { fields: { apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});
```

### Create a computeLogModule

```typescript
const { mutate } = useCreateComputeLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```
