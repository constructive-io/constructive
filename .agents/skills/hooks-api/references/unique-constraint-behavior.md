# uniqueConstraintBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UniqueConstraintBehavior data operations

## Usage

```typescript
useUniqueConstraintBehaviorsQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, uniqueConstraintId: true, updatedAt: true } } })
useUniqueConstraintBehaviorQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, uniqueConstraintId: true, updatedAt: true } } })
useCreateUniqueConstraintBehaviorMutation({ selection: { fields: { id: true } } })
useUpdateUniqueConstraintBehaviorMutation({ selection: { fields: { id: true } } })
useDeleteUniqueConstraintBehaviorMutation({})
```

## Examples

### List all uniqueConstraintBehaviors

```typescript
const { data, isLoading } = useUniqueConstraintBehaviorsQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, uniqueConstraintId: true, updatedAt: true } },
});
```

### Create a uniqueConstraintBehavior

```typescript
const { mutate } = useCreateUniqueConstraintBehaviorMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', uniqueConstraintId: '<UUID>' });
```
