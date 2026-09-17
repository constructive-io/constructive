# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-wide feature flags and settings; controls which platform features are available to all APIs in this scope

## Usage

```typescript
db.databaseSetting.findMany({ select: { id: true } }).execute()
db.databaseSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseSetting.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBilling: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', labels: '<JSON>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' }, select: { id: true } }).execute()
db.databaseSetting.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.databaseSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseSetting records

```typescript
const items = await db.databaseSetting.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a databaseSetting

```typescript
const item = await db.databaseSetting.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBilling: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableIntrospection: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', idleInTransactionTimeoutMs: '<BigInt>', labels: '<JSON>', lockTimeoutMs: '<BigInt>', maxConcurrentRequests: '<Int>', maxPageSize: '<Int>', maxQueryCost: '<Int>', maxQueryDepth: '<Int>', maxQueueWaitMs: '<Int>', maxRequestBytes: '<Int>', options: '<JSON>', rateLimitBurst: '<Int>', rateLimitRpm: '<Int>', statementTimeoutMs: '<BigInt>' },
  select: { id: true }
}).execute();
```
