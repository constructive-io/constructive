# functionGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
useFunctionGraphCommitsQuery({ selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } } })
useFunctionGraphCommitQuery({ id: '<UUID>', selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } } })
useCreateFunctionGraphCommitMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphCommitMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphCommitMutation({})
```

## Examples

### List all functionGraphCommits

```typescript
const { data, isLoading } = useFunctionGraphCommitsQuery({
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});
```

### Create a functionGraphCommit

```typescript
const { mutate } = useCreateFunctionGraphCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```
