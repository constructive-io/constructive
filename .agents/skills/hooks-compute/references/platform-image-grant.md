# platformImageGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a catalog image usable by one scope

## Usage

```typescript
usePlatformImageGrantsQuery({ selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, imageId: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformImageGrantQuery({ id: '<UUID>', selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, imageId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformImageGrantMutation({ selection: { fields: { id: true } } })
useUpdatePlatformImageGrantMutation({ selection: { fields: { id: true } } })
useDeletePlatformImageGrantMutation({})
```

## Examples

### List all platformImageGrants

```typescript
const { data, isLoading } = usePlatformImageGrantsQuery({
  selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, imageId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformImageGrant

```typescript
const { mutate } = useCreatePlatformImageGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actions: '<String>', createdByPrincipal: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', imageId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
