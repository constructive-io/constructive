# platformResourceUtilizationDaily

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourceUtilizationDaily data operations

## Usage

```typescript
usePlatformResourceUtilizationDailiesQuery({ selection: { fields: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } } })
useCreatePlatformResourceUtilizationDailyMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourceUtilizationDailies

```typescript
const { data, isLoading } = usePlatformResourceUtilizationDailiesQuery({
  selection: { fields: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});
```

### Create a platformResourceUtilizationDaily

```typescript
const { mutate } = useCreatePlatformResourceUtilizationDailyMutation({
  selection: { fields: { id: true } },
});
mutate({ avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```
