# partition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Partition data operations

## Usage

```typescript
usePartitionsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, createdAt: true, updatedAt: true } } })
usePartitionQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, createdAt: true, updatedAt: true } } })
useCreatePartitionMutation({ selection: { fields: { id: true } } })
useUpdatePartitionMutation({ selection: { fields: { id: true } } })
useDeletePartitionMutation({})
```

## Examples

### List all partitions

```typescript
const { data, isLoading } = usePartitionsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, strategy: true, partitionKeyId: true, interval: true, retention: true, retentionKeepTable: true, premake: true, namingPattern: true, createdAt: true, updatedAt: true } },
});
```

### Create a partition

```typescript
const { mutate } = useCreatePartitionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', strategy: '<String>', partitionKeyId: '<UUID>', interval: '<String>', retention: '<String>', retentionKeepTable: '<Boolean>', premake: '<Int>', namingPattern: '<String>' });
```
