# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AstMigration data operations

## Usage

```typescript
useAstMigrationsQuery({ selection: { fields: { action: true, actionId: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } } })
useAstMigrationQuery({ id: '<Int>', selection: { fields: { action: true, actionId: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } } })
useCreateAstMigrationMutation({ selection: { fields: { id: true } } })
useUpdateAstMigrationMutation({ selection: { fields: { id: true } } })
useDeleteAstMigrationMutation({})
```

## Examples

### List all astMigrations

```typescript
const { data, isLoading } = useAstMigrationsQuery({
  selection: { fields: { action: true, actionId: true, actorId: true, createdAt: true, databaseId: true, deploy: true, deploys: true, id: true, name: true, payload: true, requires: true, revert: true, verify: true } },
});
```

### Create a astMigration

```typescript
const { mutate } = useCreateAstMigrationMutation({
  selection: { fields: { id: true } },
});
mutate({ action: '<String>', actionId: '<UUID>', actorId: '<UUID>', databaseId: '<UUID>', deploy: '<JSON>', deploys: '<String>', name: '<String>', payload: '<JSON>', requires: '<String>', revert: '<JSON>', verify: '<JSON>' });
```
