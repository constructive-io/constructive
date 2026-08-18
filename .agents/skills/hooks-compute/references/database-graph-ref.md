# databaseGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
useDatabaseGraphRefsQuery({ selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } } })
useDatabaseGraphRefQuery({ id: '<UUID>', selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } } })
useCreateDatabaseGraphRefMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseGraphRefMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseGraphRefMutation({})
```

## Examples

### List all databaseGraphRefs

```typescript
const { data, isLoading } = useDatabaseGraphRefsQuery({
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});
```

### Create a databaseGraphRef

```typescript
const { mutate } = useCreateDatabaseGraphRefMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' });
```
