# orgMember

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Simplified view of active members in an entity, used for listing who belongs to an org or group

## Usage

```typescript
useOrgMembersQuery({ selection: { fields: { actorId: true, entityId: true, id: true, isAdmin: true } } })
useOrgMemberQuery({ id: '<UUID>', selection: { fields: { actorId: true, entityId: true, id: true, isAdmin: true } } })
useCreateOrgMemberMutation({ selection: { fields: { id: true } } })
useUpdateOrgMemberMutation({ selection: { fields: { id: true } } })
useDeleteOrgMemberMutation({})
```

## Examples

### List all orgMembers

```typescript
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { actorId: true, entityId: true, id: true, isAdmin: true } },
});
```

### Create a orgMember

```typescript
const { mutate } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entityId: '<UUID>', isAdmin: '<Boolean>' });
```
