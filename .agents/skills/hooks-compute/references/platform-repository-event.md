# platformRepositoryEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Normalized repository events from local hooks and external providers

## Usage

```typescript
usePlatformRepositoryEventsQuery({ selection: { fields: { actorId: true, commitSha: true, createdAt: true, createdByPrincipal: true, deliveryId: true, eventType: true, id: true, metadata: true, payload: true, ref: true, repositoryId: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformRepositoryEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, commitSha: true, createdAt: true, createdByPrincipal: true, deliveryId: true, eventType: true, id: true, metadata: true, payload: true, ref: true, repositoryId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformRepositoryEventMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRepositoryEventMutation({ selection: { fields: { id: true } } })
useDeletePlatformRepositoryEventMutation({})
```

## Examples

### List all platformRepositoryEvents

```typescript
const { data, isLoading } = usePlatformRepositoryEventsQuery({
  selection: { fields: { actorId: true, commitSha: true, createdAt: true, createdByPrincipal: true, deliveryId: true, eventType: true, id: true, metadata: true, payload: true, ref: true, repositoryId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformRepositoryEvent

```typescript
const { mutate } = useCreatePlatformRepositoryEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', deliveryId: '<String>', eventType: '<String>', metadata: '<JSON>', payload: '<JSON>', ref: '<String>', repositoryId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
