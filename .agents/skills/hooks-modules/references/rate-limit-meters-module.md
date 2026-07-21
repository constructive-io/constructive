# rateLimitMetersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RateLimitMetersModule data operations

## Usage

```typescript
useRateLimitMetersModulesQuery({ selection: { fields: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } } })
useRateLimitMetersModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } } })
useCreateRateLimitMetersModuleMutation({ selection: { fields: { id: true } } })
useUpdateRateLimitMetersModuleMutation({ selection: { fields: { id: true } } })
useDeleteRateLimitMetersModuleMutation({})
```

## Examples

### List all rateLimitMetersModules

```typescript
const { data, isLoading } = useRateLimitMetersModulesQuery({
  selection: { fields: { apiName: true, checkRateLimitFunction: true, databaseId: true, defaultPermissions: true, id: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, rateLimitOverridesTableId: true, rateLimitOverridesTableName: true, rateLimitStateTableId: true, rateLimitStateTableName: true, rateWindowLimitsTableId: true, rateWindowLimitsTableName: true, schemaId: true } },
});
```

### Create a rateLimitMetersModule

```typescript
const { mutate } = useCreateRateLimitMetersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', checkRateLimitFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', schemaId: '<UUID>' });
```
