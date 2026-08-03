# fieldBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FieldBehavior data operations

## Usage

```typescript
useFieldBehaviorsQuery({ selection: { fields: { createdAt: true, databaseId: true, fieldId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true } } })
useFieldBehaviorQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, fieldId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true } } })
useCreateFieldBehaviorMutation({ selection: { fields: { id: true } } })
useUpdateFieldBehaviorMutation({ selection: { fields: { id: true } } })
useDeleteFieldBehaviorMutation({})
```

## Examples

### List all fieldBehaviors

```typescript
const { data, isLoading } = useFieldBehaviorsQuery({
  selection: { fields: { createdAt: true, databaseId: true, fieldId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true } },
});
```

### Create a fieldBehavior

```typescript
const { mutate } = useCreateFieldBehaviorMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', fieldId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>' });
```
