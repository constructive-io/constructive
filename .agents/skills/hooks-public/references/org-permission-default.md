# orgPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default permission bitmask assigned to new members upon joining

## Usage

```typescript
useOrgPermissionDefaultsQuery({ selection: { fields: { id: true, permissions: true, entityId: true } } })
useOrgPermissionDefaultQuery({ id: '<UUID>', selection: { fields: { id: true, permissions: true, entityId: true } } })
useCreateOrgPermissionDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionDefaultMutation({})
```

## Examples

### List all orgPermissionDefaults

```typescript
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true, entityId: true } },
});
```

### Create a orgPermissionDefault

```typescript
const { mutate } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ permissions: '<BitString>', entityId: '<UUID>' });
```
