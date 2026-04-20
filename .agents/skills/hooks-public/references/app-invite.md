# appInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
useAppInvitesQuery({ selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } } })
useAppInviteQuery({ id: '<UUID>', selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } } })
useCreateAppInviteMutation({ selection: { fields: { id: true } } })
useUpdateAppInviteMutation({ selection: { fields: { id: true } } })
useDeleteAppInviteMutation({})
```

## Examples

### List all appInvites

```typescript
const { data, isLoading } = useAppInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true } },
});
```

### Create a appInvite

```typescript
const { mutate } = useCreateAppInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' });
```
