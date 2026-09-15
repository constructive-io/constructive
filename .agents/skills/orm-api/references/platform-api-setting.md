# platformApiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings

## Usage

```typescript
db.platformApiSetting.findMany({ select: { id: true } }).execute()
db.platformApiSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformApiSetting.create({ data: { apiId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' }, select: { id: true } }).execute()
db.platformApiSetting.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute()
db.platformApiSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformApiSetting records

```typescript
const items = await db.platformApiSetting.findMany({
  select: { id: true, apiId: true }
}).execute();
```

### Create a platformApiSetting

```typescript
const item = await db.platformApiSetting.create({
  data: { apiId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' },
  select: { id: true }
}).execute();
```
