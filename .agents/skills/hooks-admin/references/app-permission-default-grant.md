# appPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of permission additions and removals from the defaults bitmask

## Usage

```typescript
useAppPermissionDefaultGrantsQuery({ selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, createdAt: true, updatedAt: true } } })
useAppPermissionDefaultGrantQuery({ id: '<UUID>', selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateAppPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppPermissionDefaultGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppPermissionDefaultGrantMutation({})
```

## Examples

### List all appPermissionDefaultGrants

```typescript
const { data, isLoading } = useAppPermissionDefaultGrantsQuery({
  selection: { fields: { id: true, permissionId: true, isGrant: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a appPermissionDefaultGrant

```typescript
const { mutate } = useCreateAppPermissionDefaultGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ permissionId: '<UUID>', isGrant: '<Boolean>', grantorId: '<UUID>' });
```
