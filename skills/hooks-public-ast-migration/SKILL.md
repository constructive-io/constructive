---
name: hooks-public-ast-migration
description: React Query hooks for AstMigration data operations
---

# hooks-public-ast-migration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AstMigration data operations

## Usage

```typescript
useAstMigrationsQuery({ selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } } })
useAstMigrationQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, name: true, requires: true, payload: true, deploys: true, deploy: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true } } })
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
mutate({ databaseId: '<value>', name: '<value>', requires: '<value>', payload: '<value>', deploys: '<value>', deploy: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' });
```
