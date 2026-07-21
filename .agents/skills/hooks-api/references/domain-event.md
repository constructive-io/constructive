# domainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only audit trail of the domain verify->DNS->issue lifecycle, mirroring resource_events / cluster_events. One row per state transition emitted by the domain:* functions.

## Usage

```typescript
useDomainEventsQuery({ selection: { fields: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } } })
useDomainEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } } })
useCreateDomainEventMutation({ selection: { fields: { id: true } } })
useUpdateDomainEventMutation({ selection: { fields: { id: true } } })
useDeleteDomainEventMutation({})
```

## Examples

### List all domainEvents

```typescript
const { data, isLoading } = useDomainEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, ownerId: true } },
});
```

### Create a domainEvent

```typescript
const { mutate } = useCreateDomainEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>', ownerId: '<UUID>' });
```
