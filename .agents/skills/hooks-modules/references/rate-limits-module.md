# rateLimitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RateLimitsModule data operations

## Usage

```typescript
useRateLimitsModulesQuery({ selection: { fields: { databaseId: true, id: true, ipRateLimitsTable: true, ipRateLimitsTableId: true, rateLimitSettingsTable: true, rateLimitSettingsTableId: true, rateLimitsTable: true, rateLimitsTableId: true, schemaId: true } } })
useRateLimitsModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, ipRateLimitsTable: true, ipRateLimitsTableId: true, rateLimitSettingsTable: true, rateLimitSettingsTableId: true, rateLimitsTable: true, rateLimitsTableId: true, schemaId: true } } })
useCreateRateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateRateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteRateLimitsModuleMutation({})
```

## Examples

### List all rateLimitsModules

```typescript
const { data, isLoading } = useRateLimitsModulesQuery({
  selection: { fields: { databaseId: true, id: true, ipRateLimitsTable: true, ipRateLimitsTableId: true, rateLimitSettingsTable: true, rateLimitSettingsTableId: true, rateLimitsTable: true, rateLimitsTableId: true, schemaId: true } },
});
```

### Create a rateLimitsModule

```typescript
const { mutate } = useCreateRateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', ipRateLimitsTable: '<String>', ipRateLimitsTableId: '<UUID>', rateLimitSettingsTable: '<String>', rateLimitSettingsTableId: '<UUID>', rateLimitsTable: '<String>', rateLimitsTableId: '<UUID>', schemaId: '<UUID>' });
```
