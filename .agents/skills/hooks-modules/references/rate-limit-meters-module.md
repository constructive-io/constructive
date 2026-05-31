# rateLimitMetersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RateLimitMetersModule data operations

## Usage

```typescript
useRateLimitMetersModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, apiName: true, privateApiName: true } } })
useRateLimitMetersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, apiName: true, privateApiName: true } } })
useCreateRateLimitMetersModuleMutation({ selection: { fields: { id: true } } })
useUpdateRateLimitMetersModuleMutation({ selection: { fields: { id: true } } })
useDeleteRateLimitMetersModuleMutation({})
```

## Examples

### List all rateLimitMetersModules

```typescript
const { data, isLoading } = useRateLimitMetersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, checkRateLimitFunction: true, prefix: true, apiName: true, privateApiName: true } },
});
```

### Create a rateLimitMetersModule

```typescript
const { mutate } = useCreateRateLimitMetersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', checkRateLimitFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
