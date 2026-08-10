# meter

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines billable meters (what to track: quotas, feature flags, credit pools)

## Usage

```typescript
useMetersQuery({ selection: { fields: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } } })
useMeterQuery({ id: '<UUID>', selection: { fields: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } } })
useCreateMeterMutation({ selection: { fields: { id: true } } })
useUpdateMeterMutation({ selection: { fields: { id: true } } })
useDeleteMeterMutation({})
```

## Examples

### List all meters

```typescript
const { data, isLoading } = useMetersQuery({
  selection: { fields: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } },
});
```

### Create a meter

```typescript
const { mutate } = useCreateMeterMutation({
  selection: { fields: { id: true } },
});
mutate({ aggregation: '<String>', categoryMeter: '<String>', creditCost: '<Int>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', periodInterval: '<Interval>', rolloverCap: '<BigInt>', slug: '<String>', unit: '<String>' });
```
