# appLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of limit events for historical reporting and audit

## Usage

```typescript
useAppLimitEventsQuery({ selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } } })
useAppLimitEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } } })
useCreateAppLimitEventMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitEventMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitEventMutation({})
```

## Examples

### List all appLimitEvents

```typescript
const { data, isLoading } = useAppLimitEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } },
});
```

### Create a appLimitEvent

```typescript
const { mutate } = useCreateAppLimitEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' });
```
