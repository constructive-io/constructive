# meterSource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how.

## Usage

```typescript
useMeterSourcesQuery({ selection: { fields: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } } })
useMeterSourceQuery({ id: '<UUID>', selection: { fields: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } } })
useCreateMeterSourceMutation({ selection: { fields: { id: true } } })
useUpdateMeterSourceMutation({ selection: { fields: { id: true } } })
useDeleteMeterSourceMutation({})
```

## Examples

### List all meterSources

```typescript
const { data, isLoading } = useMeterSourcesQuery({
  selection: { fields: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } },
});
```

### Create a meterSource

```typescript
const { mutate } = useCreateMeterSourceMutation({
  selection: { fields: { id: true } },
});
mutate({ aggregationType: '<String>', dimensionPath: '<String>', isActive: '<Boolean>', meterSlug: '<String>', sourceMetric: '<String>' });
```
