# inferenceLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InferenceLogModule data operations

## Usage

```typescript
useInferenceLogModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } } })
useInferenceLogModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } } })
useCreateInferenceLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateInferenceLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteInferenceLogModuleMutation({})
```

## Examples

### List all inferenceLogModules

```typescript
const { data, isLoading } = useInferenceLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, inferenceLogTableId: true, inferenceLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});
```

### Create a inferenceLogModule

```typescript
const { mutate } = useCreateInferenceLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', inferenceLogTableId: '<UUID>', inferenceLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
