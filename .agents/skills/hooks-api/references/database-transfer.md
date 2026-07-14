# databaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DatabaseTransfer data operations

## Usage

```typescript
useDatabaseTransfersQuery({ selection: { fields: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } } })
useDatabaseTransferQuery({ id: '<UUID>', selection: { fields: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } } })
useCreateDatabaseTransferMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseTransferMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseTransferMutation({})
```

## Examples

### List all databaseTransfers

```typescript
const { data, isLoading } = useDatabaseTransfersQuery({
  selection: { fields: { completedAt: true, createdAt: true, databaseId: true, expiresAt: true, id: true, initiatedBy: true, notes: true, sourceApproved: true, sourceApprovedAt: true, status: true, targetApproved: true, targetApprovedAt: true, targetOwnerId: true, updatedAt: true } },
});
```

### Create a databaseTransfer

```typescript
const { mutate } = useCreateDatabaseTransferMutation({
  selection: { fields: { id: true } },
});
mutate({ completedAt: '<Datetime>', databaseId: '<UUID>', expiresAt: '<Datetime>', initiatedBy: '<UUID>', notes: '<String>', sourceApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', status: '<String>', targetApproved: '<Boolean>', targetApprovedAt: '<Datetime>', targetOwnerId: '<UUID>' });
```
