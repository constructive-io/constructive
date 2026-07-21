# resourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource lifecycle events — audit log of provisioning, updates, and failure events

## Usage

```typescript
useResourceEventsQuery({ selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } } })
useResourceEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } } })
useCreateResourceEventMutation({ selection: { fields: { id: true } } })
useUpdateResourceEventMutation({ selection: { fields: { id: true } } })
useDeleteResourceEventMutation({})
```

## Examples

### List all resourceEvents

```typescript
const { data, isLoading } = useResourceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } },
});
```

### Create a resourceEvent

```typescript
const { mutate } = useCreateResourceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' });
```
