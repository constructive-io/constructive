# meterDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default meter catalog: defines which meters are available and their default plan_limit values for new entities

## Usage

```typescript
db.meterDefault.findMany({ select: { id: true } }).execute()
db.meterDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.meterDefault.create({ data: { categoryMeter: '<String>', creditCost: '<BigFloat>', defaultPlanLimit: '<BigInt>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', slug: '<String>', unit: '<String>' }, select: { id: true } }).execute()
db.meterDefault.update({ where: { id: '<UUID>' }, data: { categoryMeter: '<String>' }, select: { id: true } }).execute()
db.meterDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all meterDefault records

```typescript
const items = await db.meterDefault.findMany({
  select: { id: true, categoryMeter: true }
}).execute();
```

### Create a meterDefault

```typescript
const item = await db.meterDefault.create({
  data: { categoryMeter: '<String>', creditCost: '<BigFloat>', defaultPlanLimit: '<BigInt>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', slug: '<String>', unit: '<String>' },
  select: { id: true }
}).execute();
```
