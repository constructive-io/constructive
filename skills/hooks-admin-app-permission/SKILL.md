---
name: hooks-admin-app-permission
description: Defines available permissions as named bits within a bitmask, used by the RBAC system for access control
---

# hooks-admin-app-permission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
useAppPermissionsQuery({ selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } } })
useAppPermissionQuery({ id: '<value>', selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } } })
useCreateAppPermissionMutation({ selection: { fields: { id: true } } })
useUpdateAppPermissionMutation({ selection: { fields: { id: true } } })
useDeleteAppPermissionMutation({})
```

## Examples

### List all appPermissions

```typescript
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});
```

### Create a appPermission

```typescript
const { mutate } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' });
```
