# platformResourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails)

## Usage

```typescript
usePlatformResourceStatusChecksQuery({ selection: { fields: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } } })
usePlatformResourceStatusCheckQuery({ id: '<UUID>', selection: { fields: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } } })
useCreatePlatformResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceStatusCheckMutation({})
```

## Examples

### List all platformResourceStatusChecks

```typescript
const { data, isLoading } = usePlatformResourceStatusChecksQuery({
  selection: { fields: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } },
});
```

### Create a platformResourceStatusCheck

```typescript
const { mutate } = useCreatePlatformResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
mutate({ completedAt: '<Datetime>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' });
```
