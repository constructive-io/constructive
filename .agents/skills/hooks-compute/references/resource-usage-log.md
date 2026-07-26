# resourceUsageLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus)

## Usage

```typescript
useResourceUsageLogsQuery({ selection: { fields: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } } })
useResourceUsageLogQuery({ id: '<UUID>', selection: { fields: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } } })
useCreateResourceUsageLogMutation({ selection: { fields: { id: true } } })
useUpdateResourceUsageLogMutation({ selection: { fields: { id: true } } })
useDeleteResourceUsageLogMutation({})
```

## Examples

### List all resourceUsageLogs

```typescript
const { data, isLoading } = useResourceUsageLogsQuery({
  selection: { fields: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } },
});
```

### Create a resourceUsageLog

```typescript
const { mutate } = useCreateResourceUsageLogMutation({
  selection: { fields: { id: true } },
});
mutate({ cpuMillicores: '<BigInt>', databaseId: '<UUID>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' });
```
