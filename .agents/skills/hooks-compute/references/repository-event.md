# repositoryEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Normalized repository events from local hooks and external providers

## Usage

```typescript
useRepositoryEventsQuery({ selection: { fields: { actorId: true, commitSha: true, createdAt: true, createdByPrincipal: true, databaseId: true, deliveryId: true, eventType: true, id: true, metadata: true, payload: true, ref: true, repositoryId: true, updatedAt: true, updatedByPrincipal: true } } })
useRepositoryEventQuery({ id: '<UUID>', selection: { fields: { actorId: true, commitSha: true, createdAt: true, createdByPrincipal: true, databaseId: true, deliveryId: true, eventType: true, id: true, metadata: true, payload: true, ref: true, repositoryId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreateRepositoryEventMutation({ selection: { fields: { id: true } } })
useUpdateRepositoryEventMutation({ selection: { fields: { id: true } } })
useDeleteRepositoryEventMutation({})
```

## Examples

### List all repositoryEvents

```typescript
const { data, isLoading } = useRepositoryEventsQuery({
  selection: { fields: { actorId: true, commitSha: true, createdAt: true, createdByPrincipal: true, databaseId: true, deliveryId: true, eventType: true, id: true, metadata: true, payload: true, ref: true, repositoryId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a repositoryEvent

```typescript
const { mutate } = useCreateRepositoryEventMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', commitSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', deliveryId: '<String>', eventType: '<String>', metadata: '<JSON>', payload: '<JSON>', ref: '<String>', repositoryId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
