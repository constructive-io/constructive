# appPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of permission additions and removals from the defaults bitmask

## Usage

```typescript
useAppPermissionDefaultGrantsQuery({ selection: { fields: { createdAt: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } } })
useAppPermissionDefaultGrantQuery({ id: '<UUID>', selection: { fields: { createdAt: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } } })
useCreateAppPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppPermissionDefaultGrantMutation({})
```

## Examples

### List all appPermissionDefaultGrants

```typescript
const { data, isLoading } = useAppPermissionDefaultGrantsQuery({
  selection: { fields: { createdAt: true, grantorId: true, id: true, isGrant: true, permissionId: true, updatedAt: true } },
});
```

### Create a appPermissionDefaultGrant

```typescript
const { mutate } = useCreateAppPermissionDefaultGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ grantorId: '<UUID>', isGrant: '<Boolean>', permissionId: '<UUID>' });
```
