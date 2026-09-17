# databaseGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
useDatabaseGraphCommitsQuery({ selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } } })
useDatabaseGraphCommitQuery({ id: '<UUID>', selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } } })
useCreateDatabaseGraphCommitMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseGraphCommitMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseGraphCommitMutation({})
```

## Examples

### List all databaseGraphCommits

```typescript
const { data, isLoading } = useDatabaseGraphCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } },
});
```

### Create a databaseGraphCommit

```typescript
const { mutate } = useCreateDatabaseGraphCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```
