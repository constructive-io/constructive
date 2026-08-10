# appEventType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Catalog of known event types with per-type configuration for aggregation, retention, and level participation

## Usage

```typescript
db.appEventType.findMany({ select: { id: true } }).execute()
db.appEventType.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appEventType.create({ data: { aggregation: '<String>', category: '<String>', description: '<String>', feedsLevels: '<Boolean>', isActive: '<Boolean>', name: '<String>', periodInterval: '<Interval>' }, select: { id: true } }).execute()
db.appEventType.update({ where: { id: '<UUID>' }, data: { aggregation: '<String>' }, select: { id: true } }).execute()
db.appEventType.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appEventType records

```typescript
const items = await db.appEventType.findMany({
  select: { id: true, aggregation: true }
}).execute();
```

### Create a appEventType

```typescript
const item = await db.appEventType.create({
  data: { aggregation: '<String>', category: '<String>', description: '<String>', feedsLevels: '<Boolean>', isActive: '<Boolean>', name: '<String>', periodInterval: '<Interval>' },
  select: { id: true }
}).execute();
```
