# appClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
useAppClaimedInvitesQuery({ selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } } })
useAppClaimedInviteQuery({ id: '<UUID>', selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } } })
useCreateAppClaimedInviteMutation({ selection: { fields: { id: true } } })
useUpdateAppClaimedInviteMutation({ selection: { fields: { id: true } } })
useDeleteAppClaimedInviteMutation({})
```

## Examples

### List all appClaimedInvites

```typescript
const { data, isLoading } = useAppClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});
```

### Create a appClaimedInvite

```typescript
const { mutate } = useCreateAppClaimedInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' });
```
