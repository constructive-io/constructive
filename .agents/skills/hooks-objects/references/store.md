# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A store represents an isolated object repository within a database.

## Usage

```typescript
useStoresQuery({ selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } } })
useStoreQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } } })
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
mutate({ name: '<String>', databaseId: '<UUID>', hash: '<UUID>' });
```
