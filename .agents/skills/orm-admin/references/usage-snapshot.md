# usageSnapshot

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns.

## Usage

```typescript
db.usageSnapshot.findMany({ select: { id: true } }).execute()
db.usageSnapshot.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.usageSnapshot.create({ data: { databaseId: '<UUID>', metricName: '<String>', metricValue: '<BigInt>', dimensions: '<JSON>', capturedAt: '<Datetime>' }, select: { id: true } }).execute()
db.usageSnapshot.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.usageSnapshot.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all usageSnapshot records

```typescript
const items = await db.usageSnapshot.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a usageSnapshot

```typescript
const item = await db.usageSnapshot.create({
  data: { databaseId: '<UUID>', metricName: '<String>', metricValue: '<BigInt>', dimensions: '<JSON>', capturedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
