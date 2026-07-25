# platformDomainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit trail of domain lifecycle events

## Usage

```typescript
usePlatformDomainEventsQuery({ selection: { fields: { actorId: true, createdAt: true, domainId: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, updatedAt: true } } })
usePlatformDomainEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, domainId: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, updatedAt: true } } })
useCreatePlatformDomainEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformDomainEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformDomainEventMutation({})
```

## Examples

### List all platformDomainEvents

```typescript
const { data, isLoading } = usePlatformDomainEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, domainId: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, updatedAt: true } },
});
```

### Create a platformDomainEvent

```typescript
const { mutate } = useCreatePlatformDomainEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', domainId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>' });
```
