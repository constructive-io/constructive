# hooks-claimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ClaimedInvite data operations

## Usage

```typescript
useClaimedInvitesQuery({ selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } } })
useClaimedInviteQuery({ id: '<value>', selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } } })
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
mutate({ data: '<value>', senderId: '<value>', receiverId: '<value>' });
```
