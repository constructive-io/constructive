# resourceUtilizationDaily

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceUtilizationDaily records

## Usage

```typescript
db.resourceUtilizationDaily.findMany({ select: { id: true } }).execute()
db.resourceUtilizationDaily.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceUtilizationDaily.create({ data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute()
db.resourceUtilizationDaily.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute()
db.resourceUtilizationDaily.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceUtilizationDaily records

```typescript
const items = await db.resourceUtilizationDaily.findMany({
  select: { id: true, avgMemoryBytes: true }
}).execute();
```

### Create a resourceUtilizationDaily

```typescript
const item = await db.resourceUtilizationDaily.create({
  data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' },
  select: { id: true }
}).execute();
```
