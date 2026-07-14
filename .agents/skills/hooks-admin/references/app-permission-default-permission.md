# appPermissionDefaultPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking permission defaults to individual permissions; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
useAppPermissionDefaultPermissionsQuery({ selection: { fields: { createdAt: true, id: true, permissionId: true, updatedAt: true } } })
useAppPermissionDefaultPermissionQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, permissionId: true, updatedAt: true } } })
useCreateAppPermissionDefaultPermissionMutation({ selection: { fields: { id: true } } })
useUpdateAppPermissionDefaultPermissionMutation({ selection: { fields: { id: true } } })
useDeleteAppPermissionDefaultPermissionMutation({})
```

## Examples

### List all appPermissionDefaultPermissions

```typescript
const { data, isLoading } = useAppPermissionDefaultPermissionsQuery({
  selection: { fields: { createdAt: true, id: true, permissionId: true, updatedAt: true } },
});
```

### Create a appPermissionDefaultPermission

```typescript
const { mutate } = useCreateAppPermissionDefaultPermissionMutation({
  selection: { fields: { id: true } },
});
mutate({ permissionId: '<UUID>' });
```
