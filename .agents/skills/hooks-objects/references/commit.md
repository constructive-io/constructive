# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
useCommitsQuery({ selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } } })
useCommitQuery({ id: '<UUID>', selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } } })
useCreateCommitMutation({ selection: { fields: { id: true } } })
useUpdateCommitMutation({ selection: { fields: { id: true } } })
useDeleteCommitMutation({})
```

## Examples

### List all commits

```typescript
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } },
});
```

### Create a commit

```typescript
const { mutate } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```
