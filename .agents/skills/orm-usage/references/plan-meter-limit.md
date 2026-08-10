# planMeterLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied)

## Usage

```typescript
db.planMeterLimit.findMany({ select: { id: true } }).execute()
db.planMeterLimit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.planMeterLimit.create({ data: { meterSlug: '<String>', planId: '<UUID>', planLimit: '<BigInt>' }, select: { id: true } }).execute()
db.planMeterLimit.update({ where: { id: '<UUID>' }, data: { meterSlug: '<String>' }, select: { id: true } }).execute()
db.planMeterLimit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all planMeterLimit records

```typescript
const items = await db.planMeterLimit.findMany({
  select: { id: true, meterSlug: true }
}).execute();
```

### Create a planMeterLimit

```typescript
const item = await db.planMeterLimit.create({
  data: { meterSlug: '<String>', planId: '<UUID>', planLimit: '<BigInt>' },
  select: { id: true }
}).execute();
```
