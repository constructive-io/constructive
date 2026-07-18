# resourceUsageLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Raw resource usage log — interval-accounting measurements from heartbeats (self) and the reconciler (observer)

## Usage

```typescript
db.resourceUsageLog.findMany({ select: { id: true } }).execute()
db.resourceUsageLog.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceUsageLog.create({ data: { cpuMillicores: '<BigInt>', databaseId: '<UUID>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' }, select: { id: true } }).execute()
db.resourceUsageLog.update({ where: { id: '<UUID>' }, data: { cpuMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.resourceUsageLog.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceUsageLog records

```typescript
const items = await db.resourceUsageLog.findMany({
  select: { id: true, cpuMillicores: true }
}).execute();
```

### Create a resourceUsageLog

```typescript
const item = await db.resourceUsageLog.create({
  data: { cpuMillicores: '<BigInt>', databaseId: '<UUID>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' },
  select: { id: true }
}).execute();
```
