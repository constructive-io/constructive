# computeLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ComputeLogModule data operations

## Usage

```typescript
useComputeLogModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } } })
useComputeLogModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } } })
useCreateComputeLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateComputeLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteComputeLogModuleMutation({})
```

## Examples

### List all computeLogModules

```typescript
const { data, isLoading } = useComputeLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, computeLogTableId: true, computeLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});
```

### Create a computeLogModule

```typescript
const { mutate } = useCreateComputeLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', computeLogTableId: '<UUID>', computeLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' });
```
