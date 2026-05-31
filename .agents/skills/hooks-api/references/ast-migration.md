# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AstMigration data operations

## Usage

```typescript
useAstMigrationsQuery({ selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } } })
useAstMigrationQuery({ id: '<Int>', selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } } })
useCreateAstMigrationMutation({ selection: { fields: { id: true } } })
useUpdateAstMigrationMutation({ selection: { fields: { id: true } } })
useDeleteAstMigrationMutation({})
```

## Examples

### List all astMigrations

```typescript
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } },
});
```

### Create a astMigration

```typescript
const { mutate } = useCreateAstMigrationMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', name: '<String>', requires: '<String>', payload: '<JSON>', deploys: '<String>', deploy: '<JSON>', revert: '<JSON>', verify: '<JSON>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' });
```
