# rateLimitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RateLimitsModule data operations

## Usage

```typescript
useRateLimitsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } } })
useRateLimitsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } } })
useCreateRateLimitsModuleMutation({ selection: { fields: { id: true } } })
useUpdateRateLimitsModuleMutation({ selection: { fields: { id: true } } })
useDeleteRateLimitsModuleMutation({})
```

## Examples

### List all rateLimitsModules

```typescript
const { data, isLoading } = useRateLimitsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, rateLimitSettingsTableId: true, ipRateLimitsTableId: true, rateLimitsTableId: true, rateLimitSettingsTable: true, ipRateLimitsTable: true, rateLimitsTable: true } },
});
```

### Create a rateLimitsModule

```typescript
const { mutate } = useCreateRateLimitsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', rateLimitSettingsTableId: '<UUID>', ipRateLimitsTableId: '<UUID>', rateLimitsTableId: '<UUID>', rateLimitSettingsTable: '<String>', ipRateLimitsTable: '<String>', rateLimitsTable: '<String>' });
```
