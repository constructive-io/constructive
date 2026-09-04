# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-wide feature flags and settings; controls which platform features are available to all APIs in this scope

## Usage

```typescript
useDatabaseSettingsQuery({ selection: { fields: { annotations: true, createdAt: true, databaseId: true, enableAggregates: true, enableBilling: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, labels: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } } })
useDatabaseSettingQuery({ id: '<UUID>', selection: { fields: { annotations: true, createdAt: true, databaseId: true, enableAggregates: true, enableBilling: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, labels: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } } })
useCreateDatabaseSettingMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseSettingMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseSettingMutation({})
```

## Examples

### List all databaseSettings

```typescript
const { data, isLoading } = useDatabaseSettingsQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, enableAggregates: true, enableBilling: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, labels: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } },
});
```

### Create a databaseSetting

```typescript
const { mutate } = useCreateDatabaseSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBilling: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', labels: '<JSON>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' });
```
