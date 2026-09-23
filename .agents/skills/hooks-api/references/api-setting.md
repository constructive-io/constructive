# apiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings

## Usage

```typescript
useApiSettingsQuery({ selection: { fields: { apiId: true, createdAt: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } } })
useApiSettingQuery({ id: '<UUID>', selection: { fields: { apiId: true, createdAt: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } } })
useCreateApiSettingMutation({ selection: { fields: { id: true } } })
useUpdateApiSettingMutation({ selection: { fields: { id: true } } })
useDeleteApiSettingMutation({})
```

## Examples

### List all apiSettings

```typescript
const { data, isLoading } = useApiSettingsQuery({
  selection: { fields: { apiId: true, createdAt: true, databaseId: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } },
});
```

### Create a apiSetting

```typescript
const { mutate } = useCreateApiSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' });
```
