# platformResourceUtilization

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourceUtilization records

## Usage

```typescript
db.platformResourceUtilization.findMany({ select: { id: true } }).execute()
db.platformResourceUtilization.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceUtilization.create({ data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute()
db.platformResourceUtilization.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute()
db.platformResourceUtilization.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceUtilization records

```typescript
const items = await db.platformResourceUtilization.findMany({
  select: { id: true, avgMemoryBytes: true }
}).execute();
```

### Create a platformResourceUtilization

```typescript
const item = await db.platformResourceUtilization.create({
  data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' },
  select: { id: true }
}).execute();
```
