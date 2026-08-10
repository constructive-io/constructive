# planPricing

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Billing intervals and pricing for each plan tier

## Usage

```typescript
db.planPricing.findMany({ select: { id: true } }).execute()
db.planPricing.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.planPricing.create({ data: { billingInterval: '<String>', currency: '<String>', discountPercent: '<BigFloat>', isActive: '<Boolean>', planId: '<UUID>', price: '<BigInt>' }, select: { id: true } }).execute()
db.planPricing.update({ where: { id: '<UUID>' }, data: { billingInterval: '<String>' }, select: { id: true } }).execute()
db.planPricing.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all planPricing records

```typescript
const items = await db.planPricing.findMany({
  select: { id: true, billingInterval: true }
}).execute();
```

### Create a planPricing

```typescript
const item = await db.planPricing.create({
  data: { billingInterval: '<String>', currency: '<String>', discountPercent: '<BigFloat>', isActive: '<Boolean>', planId: '<UUID>', price: '<BigInt>' },
  select: { id: true }
}).execute();
```
