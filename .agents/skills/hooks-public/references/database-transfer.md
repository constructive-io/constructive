# databaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DatabaseTransfer data operations

## Usage

```typescript
useDatabaseTransfersQuery({ selection: { fields: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } } })
useDatabaseTransferQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } } })
useCreateDatabaseTransferMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseTransferMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseTransferMutation({})
```

## Examples

### List all databaseTransfers

```typescript
const { data, isLoading } = useDatabaseTransfersQuery({
  selection: { fields: { id: true, databaseId: true, targetOwnerId: true, sourceApproved: true, targetApproved: true, sourceApprovedAt: true, targetApprovedAt: true, status: true, initiatedBy: true, notes: true, expiresAt: true, createdAt: true, updatedAt: true, completedAt: true } },
});
```

### Create a databaseTransfer

```typescript
const { mutate } = useCreateDatabaseTransferMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', targetOwnerId: '<UUID>', sourceApproved: '<Boolean>', targetApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', targetApprovedAt: '<Datetime>', status: '<String>', initiatedBy: '<UUID>', notes: '<String>', expiresAt: '<Datetime>', completedAt: '<Datetime>' });
```
