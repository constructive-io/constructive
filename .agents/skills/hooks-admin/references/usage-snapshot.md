# usageSnapshot

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns.

## Usage

```typescript
useUsageSnapshotsQuery({ selection: { fields: { databaseId: true, metricName: true, metricValue: true, dimensions: true, capturedAt: true, id: true } } })
useUsageSnapshotQuery({ id: '<UUID>', selection: { fields: { databaseId: true, metricName: true, metricValue: true, dimensions: true, capturedAt: true, id: true } } })
useCreateUsageSnapshotMutation({ selection: { fields: { id: true } } })
useUpdateUsageSnapshotMutation({ selection: { fields: { id: true } } })
useDeleteUsageSnapshotMutation({})
```

## Examples

### List all usageSnapshots

```typescript
const { data, isLoading } = useUsageSnapshotsQuery({
  selection: { fields: { databaseId: true, metricName: true, metricValue: true, dimensions: true, capturedAt: true, id: true } },
});
```

### Create a usageSnapshot

```typescript
const { mutate } = useCreateUsageSnapshotMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', metricName: '<String>', metricValue: '<BigInt>', dimensions: '<JSON>', capturedAt: '<Datetime>' });
```
