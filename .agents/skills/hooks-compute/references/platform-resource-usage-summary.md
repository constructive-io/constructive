# platformResourceUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals

## Usage

```typescript
usePlatformResourceUsageSummariesQuery({ selection: { fields: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } } })
usePlatformResourceUsageSummaryQuery({ id: '<UUID>', selection: { fields: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } } })
useCreatePlatformResourceUsageSummaryMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceUsageSummaryMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceUsageSummaryMutation({})
```

## Examples

### List all platformResourceUsageSummaries

```typescript
const { data, isLoading } = usePlatformResourceUsageSummariesQuery({
  selection: { fields: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});
```

### Create a platformResourceUsageSummary

```typescript
const { mutate } = useCreatePlatformResourceUsageSummaryMutation({
  selection: { fields: { id: true } },
});
mutate({ date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```
