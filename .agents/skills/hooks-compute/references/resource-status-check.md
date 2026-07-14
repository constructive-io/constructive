# resourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails)

## Usage

```typescript
useResourceStatusChecksQuery({ selection: { fields: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } } })
useResourceStatusCheckQuery({ id: '<UUID>', selection: { fields: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } } })
useCreateResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useUpdateResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useDeleteResourceStatusCheckMutation({})
```

## Examples

### List all resourceStatusChecks

```typescript
const { data, isLoading } = useResourceStatusChecksQuery({
  selection: { fields: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } },
});
```

### Create a resourceStatusCheck

```typescript
const { mutate } = useCreateResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
mutate({ completedAt: '<Datetime>', databaseId: '<UUID>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' });
```
