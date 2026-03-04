---
name: hooks-admin-app-admin-grant
description: Records of admin role grants and revocations between members
---

# hooks-admin-app-admin-grant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
useAppAdminGrantsQuery({ selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useAppAdminGrantQuery({ id: '<value>', selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateAppAdminGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppAdminGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppAdminGrantMutation({})
```

## Examples

### List all appAdminGrants

```typescript
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a appAdminGrant

```typescript
const { mutate } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```
