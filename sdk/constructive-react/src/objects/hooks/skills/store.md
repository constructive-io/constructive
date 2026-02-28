# hooks-store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Store data operations

## Usage

```typescript
useStoresQuery({ selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } } })
useStoreQuery({ id: '<value>', selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } } })
useCreateStoreMutation({ selection: { fields: { id: true } } })
useUpdateStoreMutation({ selection: { fields: { id: true } } })
useDeleteStoreMutation({})
```

## Examples

### List all stores

```typescript
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});
```

### Create a store

```typescript
const { mutate } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', databaseId: '<value>', hash: '<value>' });
```
