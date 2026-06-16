# plansModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlansModule records

## Usage

```typescript
db.plansModule.findMany({ select: { id: true } }).execute()
db.plansModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.plansModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', planMeterLimitsTableId: '<UUID>', planCapsTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyBillingPlanFunction: '<String>', applyPlanCapsFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.plansModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.plansModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all plansModule records

```typescript
const items = await db.plansModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a plansModule

```typescript
const item = await db.plansModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', planMeterLimitsTableId: '<UUID>', planCapsTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyBillingPlanFunction: '<String>', applyPlanCapsFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
