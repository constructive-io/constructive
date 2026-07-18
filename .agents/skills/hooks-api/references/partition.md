# partition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Partition data operations

## Usage

```typescript
usePartitionsQuery({ selection: { fields: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } } })
usePartitionQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } } })
useCreatePartitionMutation({ selection: { fields: { id: true } } })
useUpdatePartitionMutation({ selection: { fields: { id: true } } })
useDeletePartitionMutation({})
```

## Examples

### List all partitions

```typescript
const { data, isLoading } = usePartitionsQuery({
  selection: { fields: { createdAt: true, databaseId: true, id: true, interval: true, isParented: true, namingPattern: true, partitionKeyId: true, premake: true, retention: true, retentionKeepTable: true, strategy: true, tableId: true, updatedAt: true } },
});
```

### Create a partition

```typescript
const { mutate } = useCreatePartitionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', interval: '<String>', isParented: '<Boolean>', namingPattern: '<String>', partitionKeyId: '<UUID>', premake: '<Int>', retention: '<String>', retentionKeepTable: '<Boolean>', strategy: '<String>', tableId: '<UUID>' });
```
