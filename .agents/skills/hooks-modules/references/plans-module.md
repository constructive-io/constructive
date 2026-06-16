# plansModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlansModule data operations

## Usage

```typescript
usePlansModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } } })
usePlansModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } } })
useCreatePlansModuleMutation({ selection: { fields: { id: true } } })
useUpdatePlansModuleMutation({ selection: { fields: { id: true } } })
useDeletePlansModuleMutation({})
```

## Examples

### List all plansModules

```typescript
const { data, isLoading } = usePlansModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, planMeterLimitsTableId: true, planCapsTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, applyBillingPlanFunction: true, applyPlanCapsFunction: true, prefix: true, apiName: true, privateApiName: true } },
});
```

### Create a plansModule

```typescript
const { mutate } = useCreatePlansModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', planMeterLimitsTableId: '<UUID>', planCapsTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', applyBillingPlanFunction: '<String>', applyPlanCapsFunction: '<String>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
