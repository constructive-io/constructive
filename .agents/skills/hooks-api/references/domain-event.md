# domainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit trail of domain lifecycle events

## Usage

```typescript
useDomainEventsQuery({ selection: { fields: { actorId: true, createdAt: true, databaseId: true, domainId: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, updatedAt: true } } })
useDomainEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, databaseId: true, domainId: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, updatedAt: true } } })
useCreateDomainEventMutation({ selection: { fields: { id: true } } })
useUpdateDomainEventMutation({ selection: { fields: { id: true } } })
useDeleteDomainEventMutation({})
```

## Examples

### List all domainEvents

```typescript
const { data, isLoading } = useDomainEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, domainId: true, domainVerificationId: true, eventType: true, id: true, managedDomainId: true, message: true, metadata: true, updatedAt: true } },
});
```

### Create a domainEvent

```typescript
const { mutate } = useCreateDomainEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', databaseId: '<UUID>', domainId: '<UUID>', domainVerificationId: '<UUID>', eventType: '<String>', managedDomainId: '<UUID>', message: '<String>', metadata: '<JSON>' });
```
