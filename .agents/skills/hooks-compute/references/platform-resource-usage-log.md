# platformResourceUsageLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Raw resource usage log — interval-accounting measurements from heartbeats (self) and the reconciler (observer)

## Usage

```typescript
usePlatformResourceUsageLogsQuery({ selection: { fields: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } } })
usePlatformResourceUsageLogQuery({ id: '<UUID>', selection: { fields: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } } })
useCreatePlatformResourceUsageLogMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceUsageLogMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceUsageLogMutation({})
```

## Examples

### List all platformResourceUsageLogs

```typescript
const { data, isLoading } = usePlatformResourceUsageLogsQuery({
  selection: { fields: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } },
});
```

### Create a platformResourceUsageLog

```typescript
const { mutate } = useCreatePlatformResourceUsageLogMutation({
  selection: { fields: { id: true } },
});
mutate({ cpuMillicores: '<BigInt>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' });
```
