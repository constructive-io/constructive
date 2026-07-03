# resourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource lifecycle events — audit log of provisioning, updates, and failure events

## Usage

```typescript
useResourceEventsQuery({ selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } } })
useResourceEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } } })
useCreateResourceEventMutation({ selection: { fields: { id: true } } })
useUpdateResourceEventMutation({ selection: { fields: { id: true } } })
useDeleteResourceEventMutation({})
```

## Examples

### List all resourceEvents

```typescript
const { data, isLoading } = useResourceEventsQuery({
  selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } },
});
```

### Create a resourceEvent

```typescript
const { mutate } = useCreateResourceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' });
```
