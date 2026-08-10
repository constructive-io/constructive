# planLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps each plan to specific limit names and their maximum allowed values

## Usage

```typescript
usePlanLimitsQuery({ selection: { fields: { id: true, limitName: true, maxValue: true, planId: true } } })
usePlanLimitQuery({ id: '<UUID>', selection: { fields: { id: true, limitName: true, maxValue: true, planId: true } } })
useCreatePlanLimitMutation({ selection: { fields: { id: true } } })
useUpdatePlanLimitMutation({ selection: { fields: { id: true } } })
useDeletePlanLimitMutation({})
```

## Examples

### List all planLimits

```typescript
const { data, isLoading } = usePlanLimitsQuery({
  selection: { fields: { id: true, limitName: true, maxValue: true, planId: true } },
});
```

### Create a planLimit

```typescript
const { mutate } = useCreatePlanLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ limitName: '<String>', maxValue: '<BigInt>', planId: '<UUID>' });
```
