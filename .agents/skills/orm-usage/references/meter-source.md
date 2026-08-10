# meterSource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how.

## Usage

```typescript
db.meterSource.findMany({ select: { id: true } }).execute()
db.meterSource.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.meterSource.create({ data: { aggregationType: '<String>', dimensionPath: '<String>', isActive: '<Boolean>', meterSlug: '<String>', sourceMetric: '<String>' }, select: { id: true } }).execute()
db.meterSource.update({ where: { id: '<UUID>' }, data: { aggregationType: '<String>' }, select: { id: true } }).execute()
db.meterSource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all meterSource records

```typescript
const items = await db.meterSource.findMany({
  select: { id: true, aggregationType: true }
}).execute();
```

### Create a meterSource

```typescript
const item = await db.meterSource.create({
  data: { aggregationType: '<String>', dimensionPath: '<String>', isActive: '<Boolean>', meterSlug: '<String>', sourceMetric: '<String>' },
  select: { id: true }
}).execute();
```
