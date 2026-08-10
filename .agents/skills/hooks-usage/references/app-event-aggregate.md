# appEventAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually

## Usage

```typescript
useAppEventAggregatesQuery({ selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } } })
useAppEventAggregateQuery({ id: '<UUID>', selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } } })
useCreateAppEventAggregateMutation({ selection: { fields: { id: true } } })
useUpdateAppEventAggregateMutation({ selection: { fields: { id: true } } })
useDeleteAppEventAggregateMutation({})
```

## Examples

### List all appEventAggregates

```typescript
const { data, isLoading } = useAppEventAggregatesQuery({
  selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } },
});
```

### Create a appEventAggregate

```typescript
const { mutate } = useCreateAppEventAggregateMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', count: '<Int>', name: '<String>', periodStart: '<Datetime>' });
```
