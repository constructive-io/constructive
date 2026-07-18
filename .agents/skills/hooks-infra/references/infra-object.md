# infraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useInfraObjectsQuery({ selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } } })
useInfraObjectQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } } })
useCreateInfraObjectMutation({ selection: { fields: { id: true } } })
useUpdateInfraObjectMutation({ selection: { fields: { id: true } } })
useDeleteInfraObjectMutation({})
```

## Examples

### List all infraObjects

```typescript
const { data, isLoading } = useInfraObjectsQuery({
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});
```

### Create a infraObject

```typescript
const { mutate } = useCreateInfraObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' });
```
