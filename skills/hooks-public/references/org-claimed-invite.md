# orgClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
useOrgClaimedInvitesQuery({ selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } } })
useOrgClaimedInviteQuery({ id: '<value>', selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } } })
useCreateOrgClaimedInviteMutation({ selection: { fields: { id: true } } })
useUpdateOrgClaimedInviteMutation({ selection: { fields: { id: true } } })
useDeleteOrgClaimedInviteMutation({})
```

## Examples

### List all orgClaimedInvites

```typescript
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});
```

### Create a orgClaimedInvite

```typescript
const { mutate } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<value>', senderId: '<value>', receiverId: '<value>', entityId: '<value>' });
```
