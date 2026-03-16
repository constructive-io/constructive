# sqlMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SqlMigration data operations

## Usage

```typescript
useSqlMigrationsQuery({ selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } } })
useSqlMigrationQuery({ id: '<value>', selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } } })
useCreateSqlMigrationMutation({ selection: { fields: { id: true } } })
useUpdateSqlMigrationMutation({ selection: { fields: { id: true } } })
useDeleteSqlMigrationMutation({})
```

## Examples

### List all sqlMigrations

```typescript
const { data, isLoading } = useSqlMigrationsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, deploy: true, deps: true, payload: true, content: true, revert: true, verify: true, createdAt: true, action: true, actionId: true, actorId: true, nameTrgmSimilarity: true, deployTrgmSimilarity: true, contentTrgmSimilarity: true, revertTrgmSimilarity: true, verifyTrgmSimilarity: true, actionTrgmSimilarity: true, searchScore: true } },
});
```

### Create a sqlMigration

```typescript
const { mutate } = useCreateSqlMigrationMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', databaseId: '<value>', deploy: '<value>', deps: '<value>', payload: '<value>', content: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>', nameTrgmSimilarity: '<value>', deployTrgmSimilarity: '<value>', contentTrgmSimilarity: '<value>', revertTrgmSimilarity: '<value>', verifyTrgmSimilarity: '<value>', actionTrgmSimilarity: '<value>', searchScore: '<value>' });
```
