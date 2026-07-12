# platformResourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resource lifecycle events — audit log of provisioning, updates, and failure events

## Usage

```typescript
usePlatformResourceEventsQuery({ selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } } })
usePlatformResourceEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } } })
useCreatePlatformResourceEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceEventMutation({})
```

## Examples

### List all platformResourceEvents

```typescript
const { data, isLoading } = usePlatformResourceEventsQuery({
  selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } },
});
```

### Create a platformResourceEvent

```typescript
const { mutate } = useCreatePlatformResourceEventMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' });
```
