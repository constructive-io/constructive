# namespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
useNamespaceEventsQuery({ selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } } })
useNamespaceEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } } })
useCreateNamespaceEventMutation({ selection: { fields: { id: true } } })
useUpdateNamespaceEventMutation({ selection: { fields: { id: true } } })
useDeleteNamespaceEventMutation({})
```

## Examples

### List all namespaceEvents

```typescript
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } },
});
```

### Create a namespaceEvent

```typescript
const { mutate } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' });
```
