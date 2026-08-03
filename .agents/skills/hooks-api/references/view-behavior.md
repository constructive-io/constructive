# viewBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ViewBehavior data operations

## Usage

```typescript
useViewBehaviorsQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true, viewId: true } } })
useViewBehaviorQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true, viewId: true } } })
useCreateViewBehaviorMutation({ selection: { fields: { id: true } } })
useUpdateViewBehaviorMutation({ selection: { fields: { id: true } } })
useDeleteViewBehaviorMutation({})
```

## Examples

### List all viewBehaviors

```typescript
const { data, isLoading } = useViewBehaviorsQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, modifier: true, scope: true, sortOrder: true, updatedAt: true, viewId: true } },
});
```

### Create a viewBehavior

```typescript
const { mutate } = useCreateViewBehaviorMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', viewId: '<UUID>' });
```
