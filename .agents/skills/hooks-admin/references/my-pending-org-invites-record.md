# myPendingOrgInvitesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MyPendingOrgInvitesRecord data operations

## Usage

```typescript
useMyPendingOrgInvitesQuery({ selection: { fields: { channel: true, createdAt: true, entityId: true, expiresAt: true, id: true, senderId: true } } })
useMyPendingOrgInvitesRecordQuery({ id: '<UUID>', selection: { fields: { channel: true, createdAt: true, entityId: true, expiresAt: true, id: true, senderId: true } } })
useCreateMyPendingOrgInvitesRecordMutation({ selection: { fields: { id: true } } })
useUpdateMyPendingOrgInvitesRecordMutation({ selection: { fields: { id: true } } })
useDeleteMyPendingOrgInvitesRecordMutation({})
```

## Examples

### List all myPendingOrgInvites

```typescript
const { data, isLoading } = useMyPendingOrgInvitesQuery({
  selection: { fields: { channel: true, createdAt: true, entityId: true, expiresAt: true, id: true, senderId: true } },
});
```

### Create a myPendingOrgInvitesRecord

```typescript
const { mutate } = useCreateMyPendingOrgInvitesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ channel: '<String>', entityId: '<UUID>', expiresAt: '<Datetime>', senderId: '<UUID>' });
```
