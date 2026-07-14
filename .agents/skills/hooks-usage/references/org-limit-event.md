# orgLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only log of limit events for historical reporting and audit

## Usage

```typescript
useOrgLimitEventsQuery({ selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } } })
useOrgLimitEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } } })
useCreateOrgLimitEventMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitEventMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitEventMutation({})
```

## Examples

### List all orgLimitEvents

```typescript
const { data, isLoading } = useOrgLimitEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } },
});
```

### Create a orgLimitEvent

```typescript
const { mutate } = useCreateOrgLimitEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' });
```
