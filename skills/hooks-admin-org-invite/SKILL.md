---
name: hooks-admin-org-invite
description: Invitation records sent to prospective members via email, with token-based redemption and expiration
---

# hooks-admin-org-invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
useOrgInvitesQuery({ selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } } })
useOrgInviteQuery({ id: '<value>', selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } } })
useCreateOrgInviteMutation({ selection: { fields: { id: true } } })
useUpdateOrgInviteMutation({ selection: { fields: { id: true } } })
useDeleteOrgInviteMutation({})
```

## Examples

### List all orgInvites

```typescript
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});
```

### Create a orgInvite

```typescript
const { mutate } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
mutate({ email: '<value>', senderId: '<value>', receiverId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', entityId: '<value>' });
```
