# appEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only log of individual user actions; every single event ever recorded

## Usage

```typescript
useAppEventsQuery({ selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true } } })
useAppEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true } } })
useCreateAppEventMutation({ selection: { fields: { id: true } } })
useUpdateAppEventMutation({ selection: { fields: { id: true } } })
useDeleteAppEventMutation({})
```

## Examples

### List all appEvents

```typescript
const { data, isLoading } = useAppEventsQuery({
  selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true } },
});
```

### Create a appEvent

```typescript
const { mutate } = useCreateAppEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', count: '<Int>', name: '<String>' });
```
