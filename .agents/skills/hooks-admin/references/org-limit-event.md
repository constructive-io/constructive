# orgLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of limit events for historical reporting and audit

## Usage

```typescript
useOrgLimitEventsQuery({ selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } } })
useOrgLimitEventQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } } })
useCreateOrgLimitEventMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitEventMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitEventMutation({})
```

## Examples

### List all orgLimitEvents

```typescript
const { data, isLoading } = useOrgLimitEventsQuery({
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});
```

### Create a orgLimitEvent

```typescript
const { mutate } = useCreateOrgLimitEventMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```
