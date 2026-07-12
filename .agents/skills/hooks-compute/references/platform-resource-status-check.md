# platformResourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails)

## Usage

```typescript
usePlatformResourceStatusChecksQuery({ selection: { fields: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } } })
usePlatformResourceStatusCheckQuery({ id: '<UUID>', selection: { fields: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } } })
useCreatePlatformResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useUpdatePlatformResourceStatusCheckMutation({ selection: { fields: { id: true } } })
useDeletePlatformResourceStatusCheckMutation({})
```

## Examples

### List all platformResourceStatusChecks

```typescript
const { data, isLoading } = usePlatformResourceStatusChecksQuery({
  selection: { fields: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } },
});
```

### Create a platformResourceStatusCheck

```typescript
const { mutate } = useCreatePlatformResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' });
```
