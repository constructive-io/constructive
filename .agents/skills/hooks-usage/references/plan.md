# plan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines plan tiers with named limit configurations

## Usage

```typescript
usePlansQuery({ selection: { fields: { description: true, id: true, isActive: true, name: true } } })
usePlanQuery({ id: '<UUID>', selection: { fields: { description: true, id: true, isActive: true, name: true } } })
useCreatePlanMutation({ selection: { fields: { id: true } } })
useUpdatePlanMutation({ selection: { fields: { id: true } } })
useDeletePlanMutation({})
```

## Examples

### List all plans

```typescript
const { data, isLoading } = usePlansQuery({
  selection: { fields: { description: true, id: true, isActive: true, name: true } },
});
```

### Create a plan

```typescript
const { mutate } = useCreatePlanMutation({
  selection: { fields: { id: true } },
});
mutate({ description: '<String>', isActive: '<Boolean>', name: '<String>' });
```
