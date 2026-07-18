# orgPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default permission bitmask assigned to new members upon joining

## Usage

```typescript
useOrgPermissionDefaultsQuery({ selection: { fields: { entityId: true, id: true, permissions: true } } })
useOrgPermissionDefaultQuery({ id: '<UUID>', selection: { fields: { entityId: true, id: true, permissions: true } } })
useCreateOrgPermissionDefaultMutation({ selection: { fields: { id: true } } })
useUpdateOrgPermissionDefaultMutation({ selection: { fields: { id: true } } })
useDeleteOrgPermissionDefaultMutation({})
```

## Examples

### List all orgPermissionDefaults

```typescript
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { entityId: true, id: true, permissions: true } },
});
```

### Create a orgPermissionDefault

```typescript
const { mutate } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', permissions: '<BitString>' });
```
