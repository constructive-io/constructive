# meter

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines billable meters (what to track: quotas, feature flags, credit pools)

## Usage

```typescript
db.meter.findMany({ select: { id: true } }).execute()
db.meter.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.meter.create({ data: { aggregation: '<String>', categoryMeter: '<String>', creditCost: '<Int>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', periodInterval: '<Interval>', rolloverCap: '<BigInt>', slug: '<String>', unit: '<String>' }, select: { id: true } }).execute()
db.meter.update({ where: { id: '<UUID>' }, data: { aggregation: '<String>' }, select: { id: true } }).execute()
db.meter.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all meter records

```typescript
const items = await db.meter.findMany({
  select: { id: true, aggregation: true }
}).execute();
```

### Create a meter

```typescript
const item = await db.meter.create({
  data: { aggregation: '<String>', categoryMeter: '<String>', creditCost: '<Int>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', periodInterval: '<Interval>', rolloverCap: '<BigInt>', slug: '<String>', unit: '<String>' },
  select: { id: true }
}).execute();
```
