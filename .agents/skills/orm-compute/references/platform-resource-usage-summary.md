# platformResourceUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals

## Usage

```typescript
db.platformResourceUsageSummary.findMany({ select: { id: true } }).execute()
db.platformResourceUsageSummary.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceUsageSummary.create({ data: { date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute()
db.platformResourceUsageSummary.update({ where: { id: '<UUID>' }, data: { date: '<Date>' }, select: { id: true } }).execute()
db.platformResourceUsageSummary.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceUsageSummary records

```typescript
const items = await db.platformResourceUsageSummary.findMany({
  select: { id: true, date: true }
}).execute();
```

### Create a platformResourceUsageSummary

```typescript
const item = await db.platformResourceUsageSummary.create({
  data: { date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' },
  select: { id: true }
}).execute();
```
