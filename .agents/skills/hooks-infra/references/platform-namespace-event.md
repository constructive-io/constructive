# platformNamespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace lifecycle events — audit log of creation, activation, deactivation, label changes

## Usage

```typescript
usePlatformNamespaceEventsQuery({ selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } } })
usePlatformNamespaceEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } } })
useCreatePlatformNamespaceEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformNamespaceEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformNamespaceEventMutation({})
```

## Examples

### List all platformNamespaceEvents

```typescript
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } },
});
```

### Create a platformNamespaceEvent

```typescript
const { mutate } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' });
```
