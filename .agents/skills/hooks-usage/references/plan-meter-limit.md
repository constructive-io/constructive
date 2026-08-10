# planMeterLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied)

## Usage

```typescript
usePlanMeterLimitsQuery({ selection: { fields: { id: true, meterSlug: true, planId: true, planLimit: true } } })
usePlanMeterLimitQuery({ id: '<UUID>', selection: { fields: { id: true, meterSlug: true, planId: true, planLimit: true } } })
useCreatePlanMeterLimitMutation({ selection: { fields: { id: true } } })
useUpdatePlanMeterLimitMutation({ selection: { fields: { id: true } } })
useDeletePlanMeterLimitMutation({})
```

## Examples

### List all planMeterLimits

```typescript
const { data, isLoading } = usePlanMeterLimitsQuery({
  selection: { fields: { id: true, meterSlug: true, planId: true, planLimit: true } },
});
```

### Create a planMeterLimit

```typescript
const { mutate } = useCreatePlanMeterLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ meterSlug: '<String>', planId: '<UUID>', planLimit: '<BigInt>' });
```
