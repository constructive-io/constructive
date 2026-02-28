# hooks-orgAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgAdminGrant data operations

## Usage

```typescript
useOrgAdminGrantsQuery({ selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useOrgAdminGrantQuery({ id: '<value>', selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateOrgAdminGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgAdminGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgAdminGrantMutation({})
```

## Examples

### List all orgAdminGrants

```typescript
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a orgAdminGrant

```typescript
const { mutate } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```
