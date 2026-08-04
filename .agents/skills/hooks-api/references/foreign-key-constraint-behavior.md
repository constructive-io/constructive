# foreignKeyConstraintBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ForeignKeyConstraintBehavior data operations

## Usage

```typescript
useForeignKeyConstraintBehaviorsQuery({ selection: { fields: { createdAt: true, databaseId: true, foreignKeyConstraintId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true } } })
useForeignKeyConstraintBehaviorQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, foreignKeyConstraintId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true } } })
useCreateForeignKeyConstraintBehaviorMutation({ selection: { fields: { id: true } } })
useUpdateForeignKeyConstraintBehaviorMutation({ selection: { fields: { id: true } } })
useDeleteForeignKeyConstraintBehaviorMutation({})
```

## Examples

### List all foreignKeyConstraintBehaviors

```typescript
const { data, isLoading } = useForeignKeyConstraintBehaviorsQuery({
  selection: { fields: { createdAt: true, databaseId: true, foreignKeyConstraintId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true } },
});
```

### Create a foreignKeyConstraintBehavior

```typescript
const { mutate } = useCreateForeignKeyConstraintBehaviorMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', foreignKeyConstraintId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>' });
```
