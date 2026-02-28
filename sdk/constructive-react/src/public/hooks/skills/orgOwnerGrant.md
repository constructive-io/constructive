# hooks-orgOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgOwnerGrant data operations

## Usage

```typescript
useOrgOwnerGrantsQuery({ selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useOrgOwnerGrantQuery({ id: '<value>', selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } } })
useCreateOrgOwnerGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgOwnerGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgOwnerGrantMutation({})
```

## Examples

### List all orgOwnerGrants

```typescript
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});
```

### Create a orgOwnerGrant

```typescript
const { mutate } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' });
```
