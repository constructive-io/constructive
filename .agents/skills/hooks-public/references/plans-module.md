# plansModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlansModule data operations

## Usage

```typescript
usePlansModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, prefix: true } } })
usePlansModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, prefix: true } } })
useCreatePlansModuleMutation({ selection: { fields: { id: true } } })
useUpdatePlansModuleMutation({ selection: { fields: { id: true } } })
useDeletePlansModuleMutation({})
```

## Examples

### List all plansModules

```typescript
const { data, isLoading } = usePlansModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, plansTableId: true, plansTableName: true, planLimitsTableId: true, planLimitsTableName: true, planPricingTableId: true, planOverridesTableId: true, applyPlanFunction: true, applyPlanAggregateFunction: true, prefix: true } },
});
```

### Create a plansModule

```typescript
const { mutate } = useCreatePlansModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', plansTableId: '<UUID>', plansTableName: '<String>', planLimitsTableId: '<UUID>', planLimitsTableName: '<String>', planPricingTableId: '<UUID>', planOverridesTableId: '<UUID>', applyPlanFunction: '<String>', applyPlanAggregateFunction: '<String>', prefix: '<String>' });
```
