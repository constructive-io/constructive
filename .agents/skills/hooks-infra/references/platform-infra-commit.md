# platformInfraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
usePlatformInfraCommitsQuery({ selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } } })
usePlatformInfraCommitQuery({ id: '<UUID>', selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } } })
useCreatePlatformInfraCommitMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInfraCommitMutation({ selection: { fields: { id: true } } })
useDeletePlatformInfraCommitMutation({})
```

## Examples

### List all platformInfraCommits

```typescript
const { data, isLoading } = usePlatformInfraCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});
```

### Create a platformInfraCommit

```typescript
const { mutate } = useCreatePlatformInfraCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```
