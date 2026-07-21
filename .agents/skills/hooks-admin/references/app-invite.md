# appInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
useAppInvitesQuery({ selection: { fields: { channel: true, createdAt: true, data: true, email: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, multiple: true, phone: true, profileId: true, senderId: true, updatedAt: true } } })
useAppInviteQuery({ id: '<UUID>', selection: { fields: { channel: true, createdAt: true, data: true, email: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, multiple: true, phone: true, profileId: true, senderId: true, updatedAt: true } } })
useCreateAppInviteMutation({ selection: { fields: { id: true } } })
useUpdateAppInviteMutation({ selection: { fields: { id: true } } })
useDeleteAppInviteMutation({})
```

## Examples

### List all appInvites

```typescript
const { data, isLoading } = useAppInvitesQuery({
  selection: { fields: { channel: true, createdAt: true, data: true, email: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, multiple: true, phone: true, profileId: true, senderId: true, updatedAt: true } },
});
```

### Create a appInvite

```typescript
const { mutate } = useCreateAppInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ channel: '<String>', data: '<JSON>', email: '<Email>', expiresAt: '<Datetime>', inviteCount: '<Int>', inviteLimit: '<Int>', inviteToken: '<String>', inviteValid: '<Boolean>', multiple: '<Boolean>', phone: '<String>', profileId: '<UUID>', senderId: '<UUID>' });
```
