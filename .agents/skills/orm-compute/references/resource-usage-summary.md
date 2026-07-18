# resourceUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals

## Usage

```typescript
db.resourceUsageSummary.findMany({ select: { id: true } }).execute()
db.resourceUsageSummary.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceUsageSummary.create({ data: { databaseId: '<UUID>', date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute()
db.resourceUsageSummary.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.resourceUsageSummary.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceUsageSummary records

```typescript
const items = await db.resourceUsageSummary.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a resourceUsageSummary

```typescript
const item = await db.resourceUsageSummary.create({
  data: { databaseId: '<UUID>', date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' },
  select: { id: true }
}).execute();
```
