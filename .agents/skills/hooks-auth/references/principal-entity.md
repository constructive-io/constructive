# principalEntity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Association table scoping principals to specific organizations

## Usage

```typescript
usePrincipalEntitiesQuery({ selection: { fields: { createdAt: true, entityId: true, id: true, ownerId: true, principalId: true, updatedAt: true } } })
usePrincipalEntityQuery({ id: '<UUID>', selection: { fields: { createdAt: true, entityId: true, id: true, ownerId: true, principalId: true, updatedAt: true } } })
useCreatePrincipalEntityMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalEntityMutation({ selection: { fields: { id: true } } })
useDeletePrincipalEntityMutation({})
```

## Examples

### List all principalEntities

```typescript
const { data, isLoading } = usePrincipalEntitiesQuery({
  selection: { fields: { createdAt: true, entityId: true, id: true, ownerId: true, principalId: true, updatedAt: true } },
});
```

### Create a principalEntity

```typescript
const { mutate } = useCreatePrincipalEntityMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', ownerId: '<UUID>', principalId: '<UUID>' });
```
