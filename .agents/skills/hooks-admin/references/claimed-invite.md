# claimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
useClaimedInvitesQuery({ selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } } })
useClaimedInviteQuery({ id: '<UUID>', selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } } })
useCreateClaimedInviteMutation({ selection: { fields: { id: true } } })
useUpdateClaimedInviteMutation({ selection: { fields: { id: true } } })
useDeleteClaimedInviteMutation({})
```

## Examples

### List all claimedInvites

```typescript
const { data, isLoading } = useClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});
```

### Create a claimedInvite

```typescript
const { mutate } = useCreateClaimedInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' });
```
