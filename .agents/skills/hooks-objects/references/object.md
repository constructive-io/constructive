# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useObjectsQuery({ selection: { fields: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } } })
useObjectQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } } })
useCreateObjectMutation({ selection: { fields: { id: true } } })
useUpdateObjectMutation({ selection: { fields: { id: true } } })
useDeleteObjectMutation({})
```

## Examples

### List all objects

```typescript
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } },
});
```

### Create a object

```typescript
const { mutate } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```
