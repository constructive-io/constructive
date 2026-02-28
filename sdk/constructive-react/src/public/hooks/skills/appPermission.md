# hooks-appPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppPermission data operations

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
