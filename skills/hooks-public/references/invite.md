# invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
useInvitesQuery({ selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, inviteTokenTrgmSimilarity: true, searchScore: true } } })
useInviteQuery({ id: '<value>', selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, inviteTokenTrgmSimilarity: true, searchScore: true } } })
useCreateInviteMutation({ selection: { fields: { id: true } } })
useUpdateInviteMutation({ selection: { fields: { id: true } } })
useDeleteInviteMutation({})
```

## Examples

### List all invites

```typescript
const { data, isLoading } = useInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, inviteTokenTrgmSimilarity: true, searchScore: true } },
});
```

### Create a invite

```typescript
const { mutate } = useCreateInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ email: '<value>', senderId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', inviteTokenTrgmSimilarity: '<value>', searchScore: '<value>' });
```
