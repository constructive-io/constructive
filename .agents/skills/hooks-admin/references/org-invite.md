# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
useOrgInvitesQuery({ selection: { fields: { channel: true, createdAt: true, data: true, email: true, entityId: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, isReadOnly: true, multiple: true, phone: true, profileId: true, receiverId: true, senderId: true, updatedAt: true } } })
useOrgInviteQuery({ id: '<UUID>', selection: { fields: { channel: true, createdAt: true, data: true, email: true, entityId: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, isReadOnly: true, multiple: true, phone: true, profileId: true, receiverId: true, senderId: true, updatedAt: true } } })
useCreateOrgInviteMutation({ selection: { fields: { id: true } } })
useUpdateOrgInviteMutation({ selection: { fields: { id: true } } })
useDeleteOrgInviteMutation({})
```

## Examples

### List all orgInvites

```typescript
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { channel: true, createdAt: true, data: true, email: true, entityId: true, expiresAt: true, id: true, inviteCount: true, inviteLimit: true, inviteToken: true, inviteValid: true, isReadOnly: true, multiple: true, phone: true, profileId: true, receiverId: true, senderId: true, updatedAt: true } },
});
```

### Create a orgInvite

```typescript
const { mutate } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ channel: '<String>', data: '<JSON>', email: '<Email>', entityId: '<UUID>', expiresAt: '<Datetime>', inviteCount: '<Int>', inviteLimit: '<Int>', inviteToken: '<String>', inviteValid: '<Boolean>', isReadOnly: '<Boolean>', multiple: '<Boolean>', phone: '<String>', profileId: '<UUID>', receiverId: '<UUID>', senderId: '<UUID>' });
```
