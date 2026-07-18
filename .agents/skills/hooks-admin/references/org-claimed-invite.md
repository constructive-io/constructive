# orgClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
useOrgClaimedInvitesQuery({ selection: { fields: { createdAt: true, data: true, entityId: true, id: true, receiverId: true, senderId: true, updatedAt: true } } })
useOrgClaimedInviteQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, entityId: true, id: true, receiverId: true, senderId: true, updatedAt: true } } })
useCreateOrgClaimedInviteMutation({ selection: { fields: { id: true } } })
useUpdateOrgClaimedInviteMutation({ selection: { fields: { id: true } } })
useDeleteOrgClaimedInviteMutation({})
```

## Examples

### List all orgClaimedInvites

```typescript
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { createdAt: true, data: true, entityId: true, id: true, receiverId: true, senderId: true, updatedAt: true } },
});
```

### Create a orgClaimedInvite

```typescript
const { mutate } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', entityId: '<UUID>', receiverId: '<UUID>', senderId: '<UUID>' });
```
