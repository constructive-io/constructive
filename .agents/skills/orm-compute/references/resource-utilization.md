# resourceUtilization

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceUtilization records

## Usage

```typescript
db.resourceUtilization.findMany({ select: { id: true } }).execute()
db.resourceUtilization.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceUtilization.create({ data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' }, select: { id: true } }).execute()
db.resourceUtilization.update({ where: { id: '<UUID>' }, data: { avgMemoryBytes: '<BigInt>' }, select: { id: true } }).execute()
db.resourceUtilization.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceUtilization records

```typescript
const items = await db.resourceUtilization.findMany({
  select: { id: true, avgMemoryBytes: true }
}).execute();
```

### Create a resourceUtilization

```typescript
const item = await db.resourceUtilization.create({
  data: { avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' },
  select: { id: true }
}).execute();
```
