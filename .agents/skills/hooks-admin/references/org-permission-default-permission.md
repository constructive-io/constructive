# orgPermissionDefaultPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
useOrgPermissionDefaultPermissionsQuery({ selection: { fields: { createdAt: true, entityId: true, id: true, permissionId: true, updatedAt: true } } })
useOrgPermissionDefaultPermissionQuery({ id: '<UUID>', selection: { fields: { createdAt: true, entityId: true, id: true, permissionId: true, updatedAt: true } } })
useCreateOrgPermissionDefaultPermissionMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionDefaultPermissionMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionDefaultPermissionMutation({})
```

## Examples

### List all orgPermissionDefaultPermissions

```typescript
const { data, isLoading } = useOrgPermissionDefaultPermissionsQuery({
  selection: { fields: { createdAt: true, entityId: true, id: true, permissionId: true, updatedAt: true } },
});
```

### Create a orgPermissionDefaultPermission

```typescript
const { mutate } = useCreateOrgPermissionDefaultPermissionMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', permissionId: '<UUID>' });
```
