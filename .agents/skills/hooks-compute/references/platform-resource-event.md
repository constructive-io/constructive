# platformResourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource lifecycle events — audit log of provisioning, updates, and failure events

## Usage

```typescript
usePlatformResourceEventsQuery({ selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } } })
usePlatformResourceEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } } })
useCreatePlatformResourceEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceEventMutation({})
```

## Examples

### List all platformResourceEvents

```typescript
const { data, isLoading } = usePlatformResourceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } },
});
```

### Create a platformResourceEvent

```typescript
const { mutate } = useCreatePlatformResourceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' });
```
