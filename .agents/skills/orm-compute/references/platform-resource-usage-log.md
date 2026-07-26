# platformResourceUsageLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus)

## Usage

```typescript
db.platformResourceUsageLog.findMany({ select: { id: true } }).execute()
db.platformResourceUsageLog.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceUsageLog.create({ data: { cpuMillicores: '<BigInt>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' }, select: { id: true } }).execute()
db.platformResourceUsageLog.update({ where: { id: '<UUID>' }, data: { cpuMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.platformResourceUsageLog.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceUsageLog records

```typescript
const items = await db.platformResourceUsageLog.findMany({
  select: { id: true, cpuMillicores: true }
}).execute();
```

### Create a platformResourceUsageLog

```typescript
const item = await db.platformResourceUsageLog.create({
  data: { cpuMillicores: '<BigInt>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' },
  select: { id: true }
}).execute();
```
