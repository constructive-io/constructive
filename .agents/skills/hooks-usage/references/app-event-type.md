# appEventType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Catalog of known event types with per-type configuration for aggregation, retention, and level participation

## Usage

```typescript
useAppEventTypesQuery({ selection: { fields: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } } })
useAppEventTypeQuery({ id: '<UUID>', selection: { fields: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } } })
useCreateAppEventTypeMutation({ selection: { fields: { id: true } } })
useUpdateAppEventTypeMutation({ selection: { fields: { id: true } } })
useDeleteAppEventTypeMutation({})
```

## Examples

### List all appEventTypes

```typescript
const { data, isLoading } = useAppEventTypesQuery({
  selection: { fields: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } },
});
```

### Create a appEventType

```typescript
const { mutate } = useCreateAppEventTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ aggregation: '<String>', category: '<String>', description: '<String>', feedsLevels: '<Boolean>', isActive: '<Boolean>', name: '<String>', periodInterval: '<Interval>' });
```
