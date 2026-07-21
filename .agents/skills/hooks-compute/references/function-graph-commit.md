# functionGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
useFunctionGraphCommitsQuery({ selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } } })
useFunctionGraphCommitQuery({ id: '<UUID>', selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } } })
useCreateFunctionGraphCommitMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphCommitMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphCommitMutation({})
```

## Examples

### List all functionGraphCommits

```typescript
const { data, isLoading } = useFunctionGraphCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});
```

### Create a functionGraphCommit

```typescript
const { mutate } = useCreateFunctionGraphCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```
