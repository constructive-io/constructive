# platformApiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings

## Usage

```typescript
usePlatformApiSettingsQuery({ selection: { fields: { apiId: true, createdAt: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } } })
usePlatformApiSettingQuery({ id: '<UUID>', selection: { fields: { apiId: true, createdAt: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } } })
useCreatePlatformApiSettingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformApiSettingMutation({ selection: { fields: { id: true } } })
useDeletePlatformApiSettingMutation({})
```

## Examples

### List all platformApiSettings

```typescript
const { data, isLoading } = usePlatformApiSettingsQuery({
  selection: { fields: { apiId: true, createdAt: true, enableAggregates: true, enableBulk: true, enableConnectionFilter: true, enableDirectUploads: true, enableI18N: true, enableIntrospection: true, enableLlm: true, enableLtree: true, enableManyToMany: true, enablePostgis: true, enablePresignedUploads: true, enableRealtime: true, enableSearch: true, id: true, idleInTransactionTimeoutMs: true, lockTimeoutMs: true, maxConcurrentRequests: true, maxPageSize: true, maxQueryCost: true, maxQueryDepth: true, maxQueueWaitMs: true, maxRequestBytes: true, options: true, rateLimitBurst: true, rateLimitRpm: true, statementTimeoutMs: true, updatedAt: true } },
});
```

### Create a platformApiSetting

```typescript
const { mutate } = useCreatePlatformApiSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' });
```
