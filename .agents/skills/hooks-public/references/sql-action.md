# sqlAction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SqlAction data operations

## Usage

```typescript
useSqlActionsQuery({ selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } } })
useSqlActionQuery({ id: '<Int>', selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } } })
useCreateSqlActionMutation({ selection: { fields: { id: true } } })
useUpdateSqlActionMutation({ selection: { fields: { id: true } } })
useDeleteSqlActionMutation({})
```

## Examples

### List all sqlActions

```typescript
const { data, isLoading } = useSqlActionsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});
```

### Create a sqlAction

```typescript
const { mutate } = useCreateSqlActionMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', payload: '<JSON>', content: '<String>', revert: '<String>', verify: '<String>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' });
```
