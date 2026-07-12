# infraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
useInfraCommitsQuery({ selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } } })
useInfraCommitQuery({ id: '<UUID>', selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } } })
useCreateInfraCommitMutation({ selection: { fields: { id: true } } })
useUpdateInfraCommitMutation({ selection: { fields: { id: true } } })
useDeleteInfraCommitMutation({})
```

## Examples

### List all infraCommits

```typescript
const { data, isLoading } = useInfraCommitsQuery({
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});
```

### Create a infraCommit

```typescript
const { mutate } = useCreateInfraCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```
