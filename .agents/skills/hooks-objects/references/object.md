# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useObjectsQuery({ selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } } })
useObjectQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } } })
useCreateObjectMutation({ selection: { fields: { id: true } } })
useUpdateObjectMutation({ selection: { fields: { id: true } } })
useDeleteObjectMutation({})
```

## Examples

### List all objects

```typescript
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } },
});
```

### Create a object

```typescript
const { mutate } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' });
```
