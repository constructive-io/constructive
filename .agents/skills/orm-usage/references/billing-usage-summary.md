# billingUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Permanent monthly usage summary per entity per meter (user-facing billing dashboard)

## Usage

```typescript
db.billingUsageSummary.findMany({ select: { id: true } }).execute()
db.billingUsageSummary.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.billingUsageSummary.create({ data: { creditsConsumed: '<BigInt>', entityId: '<UUID>', entityType: '<String>', meterSlug: '<String>', organizationId: '<UUID>', overageUnits: '<BigInt>', periodEnd: '<Datetime>', periodStart: '<Datetime>', planLimit: '<BigInt>', quantityUsed: '<BigInt>' }, select: { id: true } }).execute()
db.billingUsageSummary.update({ where: { id: '<UUID>' }, data: { creditsConsumed: '<BigInt>' }, select: { id: true } }).execute()
db.billingUsageSummary.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all billingUsageSummary records

```typescript
const items = await db.billingUsageSummary.findMany({
  select: { id: true, creditsConsumed: true }
}).execute();
```

### Create a billingUsageSummary

```typescript
const item = await db.billingUsageSummary.create({
  data: { creditsConsumed: '<BigInt>', entityId: '<UUID>', entityType: '<String>', meterSlug: '<String>', organizationId: '<UUID>', overageUnits: '<BigInt>', periodEnd: '<Datetime>', periodStart: '<Datetime>', planLimit: '<BigInt>', quantityUsed: '<BigInt>' },
  select: { id: true }
}).execute();
```
