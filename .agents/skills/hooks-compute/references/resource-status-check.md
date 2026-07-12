# resourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails)

## Usage

```typescript
useResourceStatusChecksQuery({ selection: { fields: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } } })
useResourceStatusCheckQuery({ id: '<UUID>', selection: { fields: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } } })
useCreateResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useUpdateResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useDeleteResourceStatusCheckMutation({})
```

## Examples

### List all resourceStatusChecks

```typescript
const { data, isLoading } = useResourceStatusChecksQuery({
  selection: { fields: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } },
});
```

### Create a resourceStatusCheck

```typescript
const { mutate } = useCreateResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', databaseId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' });
```
