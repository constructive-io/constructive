# sqlAction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SqlAction data operations

## Usage

```typescript
useSqlActionsQuery({ selection: { fields: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } } })
useSqlActionQuery({ id: '<Int>', selection: { fields: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } } })
useUpdateSqlActionMutation({ selection: { fields: { id: true } } })
useDeleteSqlActionMutation({})
```

## Examples

### List all sqlActions

```typescript
const { data, isLoading } = useSqlActionsQuery({
  selection: { fields: { actionId: true, actionName: true, actorId: true, content: true, createdAt: true, databaseId: true, deploy: true, deps: true, id: true, name: true, payload: true, revert: true, verify: true } },
});
```
