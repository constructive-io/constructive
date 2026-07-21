# functionGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useFunctionGraphObjectsQuery({ selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } } })
useFunctionGraphObjectQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } } })
useCreateFunctionGraphObjectMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphObjectMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphObjectMutation({})
```

## Examples

### List all functionGraphObjects

```typescript
const { data, isLoading } = useFunctionGraphObjectsQuery({
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});
```

### Create a functionGraphObject

```typescript
const { mutate } = useCreateFunctionGraphObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' });
```
