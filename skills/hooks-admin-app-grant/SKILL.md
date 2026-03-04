---
name: hooks-admin-app-grant
description: Records of individual permission grants and revocations for members via bitmask
---

# hooks-admin-app-grant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual permission grants and revocations for members via bitmask

## Usage

```typescript
useAppGrantsQuery({ selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useAppGrantQuery({ id: '<value>', selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateAppGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppGrantMutation({})
```

## Examples

### List all appGrants

```typescript
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a appGrant

```typescript
const { mutate } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ permissions: '<value>', isGrant: '<value>', actorId: '<value>', grantorId: '<value>' });
```
