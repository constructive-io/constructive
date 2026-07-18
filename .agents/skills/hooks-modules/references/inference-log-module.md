# inferenceLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InferenceLogModule data operations

## Usage

```typescript
useInferenceLogModulesQuery({ selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useInferenceLogModuleQuery({ id: '<UUID>', selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useCreateInferenceLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateInferenceLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteInferenceLogModuleMutation({})
```

## Examples

### List all inferenceLogModules

```typescript
const { data, isLoading } = useInferenceLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, inferenceLogTableId: true, inferenceLogTableName: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});
```

### Create a inferenceLogModule

```typescript
const { mutate } = useCreateInferenceLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```
