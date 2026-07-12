# functionGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useFunctionGraphObjectsQuery({ selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } } })
useFunctionGraphObjectQuery({ id: '<UUID>', selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } } })
useCreateFunctionGraphObjectMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphObjectMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphObjectMutation({})
```

## Examples

### List all functionGraphObjects

```typescript
const { data, isLoading } = useFunctionGraphObjectsQuery({
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});
```

### Create a functionGraphObject

```typescript
const { mutate } = useCreateFunctionGraphObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```
