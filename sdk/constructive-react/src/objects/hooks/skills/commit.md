# hooks-commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A commit records changes to the repository.

## Usage

```typescript
useCommitsQuery({ selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } } })
useCommitQuery({ id: '<value>', selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } } })
useCreateCommitMutation({ selection: { fields: { id: true } } })
useUpdateCommitMutation({ selection: { fields: { id: true } } })
useDeleteCommitMutation({})
```

## Examples

### List all commits

```typescript
const { data, isLoading } = useCommitsQuery({
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});
```

### Create a commit

```typescript
const { mutate } = useCreateCommitMutation({
  selection: { fields: { id: true } },
});
mutate({ message: '<value>', databaseId: '<value>', storeId: '<value>', parentIds: '<value>', authorId: '<value>', committerId: '<value>', treeId: '<value>', date: '<value>' });
```
