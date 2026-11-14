# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AstMigration data operations

## Usage

```typescript
useAstMigrationsQuery({ selection: { fields: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } } })
useAstMigrationQuery({ id: '<Int>', selection: { fields: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } } })
useUpdateAstMigrationMutation({ selection: { fields: { id: true } } })
useDeleteAstMigrationMutation({})
```

## Examples

### List all astMigrations

```typescript
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { actionId: true, actionName: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } },
});
```
