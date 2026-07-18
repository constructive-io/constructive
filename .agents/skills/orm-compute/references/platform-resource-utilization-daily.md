# platformResourceUtilizationDaily

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourceUtilizationDaily records

## Usage

```typescript
db.platformResourceUtilizationDaily.findMany({ select: { id: true } }).execute()
db.platformResourceUtilizationDaily.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceUtilizationDaily.create({ data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute()
db.platformResourceUtilizationDaily.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute()
db.platformResourceUtilizationDaily.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceUtilizationDaily records

```typescript
const items = await db.platformResourceUtilizationDaily.findMany({
  select: { id: true, avgMemoryBytes: true }
}).execute();
```

### Create a platformResourceUtilizationDaily

```typescript
const item = await db.platformResourceUtilizationDaily.create({
  data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' },
  select: { id: true }
}).execute();
```
