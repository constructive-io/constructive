# principalEntity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Association table scoping principals to specific organizations

## Usage

```typescript
usePrincipalEntitiesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, entityId: true, ownerId: true } } })
usePrincipalEntityQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, entityId: true, ownerId: true } } })
useCreatePrincipalEntityMutation({ selection: { fields: { id: true } } })
useUpdatePrincipalEntityMutation({ selection: { fields: { id: true } } })
useDeletePrincipalEntityMutation({})
```

## Examples

### List all principalEntities

```typescript
const { data, isLoading } = usePrincipalEntitiesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, entityId: true, ownerId: true } },
});
```

### Create a principalEntity

```typescript
const { mutate } = useCreatePrincipalEntityMutation({
  selection: { fields: { id: true } },
});
mutate({ principalId: '<UUID>', entityId: '<UUID>', ownerId: '<UUID>' });
```
