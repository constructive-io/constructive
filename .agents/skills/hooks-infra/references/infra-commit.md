# infraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
useInfraCommitsQuery({ selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } } })
useInfraCommitQuery({ id: '<UUID>', selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } } })
useCreateInfraCommitMutation({ selection: { fields: { id: true } } })
useUpdateInfraCommitMutation({ selection: { fields: { id: true } } })
useDeleteInfraCommitMutation({})
```

## Examples

### List all infraCommits

```typescript
const { data, isLoading } = useInfraCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});
```

### Create a infraCommit

```typescript
const { mutate } = useCreateInfraCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```
