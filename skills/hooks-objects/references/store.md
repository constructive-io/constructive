# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A store represents an isolated object repository within a database.

## Usage

```typescript
useStoresQuery({ selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true, nameTrgmSimilarity: true, searchScore: true } } })
useStoreQuery({ id: '<value>', selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true, nameTrgmSimilarity: true, searchScore: true } } })
useCreateStoreMutation({ selection: { fields: { id: true } } })
useUpdateStoreMutation({ selection: { fields: { id: true } } })
useDeleteStoreMutation({})
```

## Examples

### List all stores

```typescript
const { data, isLoading } = useStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true, nameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a store

```typescript
const { mutate } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', databaseId: '<value>', hash: '<value>', nameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
