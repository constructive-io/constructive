# appPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available permissions as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
useAppPermissionsQuery({ selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, name: true } } })
useAppPermissionQuery({ id: '<UUID>', selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, name: true } } })
useCreateAppPermissionMutation({ selection: { fields: { id: true } } })
useUpdateAppPermissionMutation({ selection: { fields: { id: true } } })
useDeleteAppPermissionMutation({})
```

## Examples

### List all appPermissions

```typescript
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { bitnum: true, bitstr: true, description: true, id: true, name: true } },
});
```

### Create a appPermission

```typescript
const { mutate } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
mutate({ bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', name: '<String>' });
```
