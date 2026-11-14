# myPendingAppInvitesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MyPendingAppInvitesRecord data operations

## Usage

```typescript
useMyPendingAppInvitesQuery({ selection: { fields: { channel: true, createdAt: true, expiresAt: true, id: true, senderId: true } } })
useMyPendingAppInvitesRecordQuery({ id: '<UUID>', selection: { fields: { channel: true, createdAt: true, expiresAt: true, id: true, senderId: true } } })
useUpdateMyPendingAppInvitesRecordMutation({ selection: { fields: { id: true } } })
useDeleteMyPendingAppInvitesRecordMutation({})
```

## Examples

### List all myPendingAppInvites

```typescript
const { data, isLoading } = useMyPendingAppInvitesQuery({
  selection: { fields: { channel: true, createdAt: true, expiresAt: true, id: true, senderId: true } },
});
```
