# infraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useInfraObjectsQuery({ selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } } })
useInfraObjectQuery({ id: '<UUID>', selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } } })
useCreateInfraObjectMutation({ selection: { fields: { id: true } } })
useUpdateInfraObjectMutation({ selection: { fields: { id: true } } })
useDeleteInfraObjectMutation({})
```

## Examples

### List all infraObjects

```typescript
const { data, isLoading } = useInfraObjectsQuery({
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});
```

### Create a infraObject

```typescript
const { mutate } = useCreateInfraObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```
