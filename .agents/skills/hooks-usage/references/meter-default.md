# meterDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default meter catalog: defines which meters are available and their default plan_limit values for new entities

## Usage

```typescript
useMeterDefaultsQuery({ selection: { fields: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } } })
useMeterDefaultQuery({ id: '<UUID>', selection: { fields: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } } })
useCreateMeterDefaultMutation({ selection: { fields: { id: true } } })
useUpdateMeterDefaultMutation({ selection: { fields: { id: true } } })
useDeleteMeterDefaultMutation({})
```

## Examples

### List all meterDefaults

```typescript
const { data, isLoading } = useMeterDefaultsQuery({
  selection: { fields: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } },
});
```

### Create a meterDefault

```typescript
const { mutate } = useCreateMeterDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ categoryMeter: '<String>', creditCost: '<BigFloat>', defaultPlanLimit: '<BigInt>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', slug: '<String>', unit: '<String>' });
```
