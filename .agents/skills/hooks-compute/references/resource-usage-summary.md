# resourceUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals

## Usage

```typescript
useResourceUsageSummariesQuery({ selection: { fields: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } } })
useResourceUsageSummaryQuery({ id: '<UUID>', selection: { fields: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } } })
useCreateResourceUsageSummaryMutation({ selection: { fields: { id: true } } })
useUpdateResourceUsageSummaryMutation({ selection: { fields: { id: true } } })
useDeleteResourceUsageSummaryMutation({})
```

## Examples

### List all resourceUsageSummaries

```typescript
const { data, isLoading } = useResourceUsageSummariesQuery({
  selection: { fields: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});
```

### Create a resourceUsageSummary

```typescript
const { mutate } = useCreateResourceUsageSummaryMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```
