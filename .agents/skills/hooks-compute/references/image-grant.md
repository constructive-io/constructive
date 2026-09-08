# imageGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a catalog image usable by one scope

## Usage

```typescript
useImageGrantsQuery({ selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, databaseId: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, imageId: true, updatedAt: true, updatedByPrincipal: true } } })
useImageGrantQuery({ id: '<UUID>', selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, databaseId: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, imageId: true, updatedAt: true, updatedByPrincipal: true } } })
useCreateImageGrantMutation({ selection: { fields: { id: true } } })
useUpdateImageGrantMutation({ selection: { fields: { id: true } } })
useDeleteImageGrantMutation({})
```

## Examples

### List all imageGrants

```typescript
const { data, isLoading } = useImageGrantsQuery({
  selection: { fields: { actions: true, createdAt: true, createdByPrincipal: true, databaseId: true, expiresAt: true, grantedBy: true, granteeKey: true, granteeScope: true, id: true, imageId: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a imageGrant

```typescript
const { mutate } = useCreateImageGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actions: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', imageId: '<UUID>', updatedByPrincipal: '<UUID>' });
```
