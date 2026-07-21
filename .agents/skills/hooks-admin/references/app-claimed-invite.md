# appClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
useAppClaimedInvitesQuery({ selection: { fields: { createdAt: true, data: true, id: true, receiverId: true, senderId: true, updatedAt: true } } })
useAppClaimedInviteQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, id: true, receiverId: true, senderId: true, updatedAt: true } } })
useCreateAppClaimedInviteMutation({ selection: { fields: { id: true } } })
useUpdateAppClaimedInviteMutation({ selection: { fields: { id: true } } })
useDeleteAppClaimedInviteMutation({})
```

## Examples

### List all appClaimedInvites

```typescript
const { data, isLoading } = useAppClaimedInvitesQuery({
  selection: { fields: { createdAt: true, data: true, id: true, receiverId: true, senderId: true, updatedAt: true } },
});
```

### Create a appClaimedInvite

```typescript
const { mutate } = useCreateAppClaimedInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', receiverId: '<UUID>', senderId: '<UUID>' });
```
