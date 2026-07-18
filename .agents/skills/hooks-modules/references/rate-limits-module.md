# rateLimitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RateLimitsModule data operations

## Usage

```typescript
useRateLimitsModulesQuery({ selection: { fields: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } } })
useRateLimitsModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } } })
useCreateRateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateRateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteRateLimitsModuleMutation({})
```

## Examples

### List all rateLimitsModules

```typescript
const { data, isLoading } = useRateLimitsModulesQuery({
  selection: { fields: { databaseId: true, id: true, ipRateLimitsTableId: true, ipRateLimitsTableName: true, rateLimitSettingsTableId: true, rateLimitSettingsTableName: true, rateLimitsTableId: true, rateLimitsTableName: true, schemaId: true } },
});
```

### Create a rateLimitsModule

```typescript
const { mutate } = useCreateRateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', ipRateLimitsTableId: '<UUID>', ipRateLimitsTableName: '<String>', rateLimitSettingsTableId: '<UUID>', rateLimitSettingsTableName: '<String>', rateLimitsTableId: '<UUID>', rateLimitsTableName: '<String>', schemaId: '<UUID>' });
```
