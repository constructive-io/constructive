# computeLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ComputeLogModule data operations

## Usage

```typescript
useComputeLogModulesQuery({ selection: { fields: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useComputeLogModuleQuery({ id: '<UUID>', selection: { fields: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useCreateComputeLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateComputeLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteComputeLogModuleMutation({})
```

## Examples

### List all computeLogModules

```typescript
const { data, isLoading } = useComputeLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, computeLogTableId: true, computeLogTableName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});
```

### Create a computeLogModule

```typescript
const { mutate } = useCreateComputeLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorFkTableId: '<UUID>', apiName: '<String>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```
