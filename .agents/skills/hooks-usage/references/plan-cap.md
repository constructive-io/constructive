# planCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps each plan to feature flag cap values (written to limit_caps when plan is applied)

## Usage

```typescript
usePlanCapsQuery({ selection: { fields: { capName: true, capValue: true, id: true, planId: true } } })
usePlanCapQuery({ id: '<UUID>', selection: { fields: { capName: true, capValue: true, id: true, planId: true } } })
useCreatePlanCapMutation({ selection: { fields: { id: true } } })
useUpdatePlanCapMutation({ selection: { fields: { id: true } } })
useDeletePlanCapMutation({})
```

## Examples

### List all planCaps

```typescript
const { data, isLoading } = usePlanCapsQuery({
  selection: { fields: { capName: true, capValue: true, id: true, planId: true } },
});
```

### Create a planCap

```typescript
const { mutate } = useCreatePlanCapMutation({
  selection: { fields: { id: true } },
});
mutate({ capName: '<String>', capValue: '<BigInt>', planId: '<UUID>' });
```
