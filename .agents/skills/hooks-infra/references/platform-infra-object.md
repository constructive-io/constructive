# platformInfraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
usePlatformInfraObjectsQuery({ selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } } })
usePlatformInfraObjectQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } } })
useCreatePlatformInfraObjectMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInfraObjectMutation({ selection: { fields: { id: true } } })
useDeletePlatformInfraObjectMutation({})
```

## Examples

### List all platformInfraObjects

```typescript
const { data, isLoading } = usePlatformInfraObjectsQuery({
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});
```

### Create a platformInfraObject

```typescript
const { mutate } = useCreatePlatformInfraObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' });
```
