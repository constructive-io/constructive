# ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
useRefsQuery({ selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } } })
useRefQuery({ id: '<UUID>', selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } } })
useCreateRefMutation({ selection: { fields: { id: true } } })
useUpdateRefMutation({ selection: { fields: { id: true } } })
useDeleteRefMutation({})
```

## Examples

### List all refs

```typescript
const { data, isLoading } = useRefsQuery({
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});
```

### Create a ref

```typescript
const { mutate } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' });
```
