# hooks-ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A ref is a data structure for pointing to a commit.

## Usage

```typescript
useRefsQuery({ selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } } })
useRefQuery({ id: '<value>', selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } } })
useCreateRefMutation({ selection: { fields: { id: true } } })
useUpdateRefMutation({ selection: { fields: { id: true } } })
useDeleteRefMutation({})
```

## Examples

### List all refs

```typescript
const { data, isLoading } = useRefsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});
```

### Create a ref

```typescript
const { mutate } = useCreateRefMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', databaseId: '<value>', storeId: '<value>', commitId: '<value>' });
```
