# orgMember

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Simplified view of active members in an entity, used for listing who belongs to an org or group

## Usage

```typescript
useOrgMembersQuery({ selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } } })
useOrgMemberQuery({ id: '<value>', selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } } })
useCreateOrgMemberMutation({ selection: { fields: { id: true } } })
useUpdateOrgMemberMutation({ selection: { fields: { id: true } } })
useDeleteOrgMemberMutation({})
```

## Examples

### List all orgMembers

```typescript
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});
```

### Create a orgMember

```typescript
const { mutate } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
mutate({ isAdmin: '<value>', actorId: '<value>', entityId: '<value>' });
```
