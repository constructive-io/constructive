# fileRefField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for FileRefField data operations

## Usage

```typescript
useFileRefFieldsQuery({ selection: { fields: { bucketKey: true, bucketTags: true, databaseId: true, enforceFk: true, fieldId: true, id: true, isPublic: true, storageModuleId: true, tableId: true } } })
useFileRefFieldQuery({ id: '<UUID>', selection: { fields: { bucketKey: true, bucketTags: true, databaseId: true, enforceFk: true, fieldId: true, id: true, isPublic: true, storageModuleId: true, tableId: true } } })
useCreateFileRefFieldMutation({ selection: { fields: { id: true } } })
useUpdateFileRefFieldMutation({ selection: { fields: { id: true } } })
useDeleteFileRefFieldMutation({})
```

## Examples

### List all fileRefFields

```typescript
const { data, isLoading } = useFileRefFieldsQuery({
  selection: { fields: { bucketKey: true, bucketTags: true, databaseId: true, enforceFk: true, fieldId: true, id: true, isPublic: true, storageModuleId: true, tableId: true } },
});
```

### Create a fileRefField

```typescript
const { mutate } = useCreateFileRefFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ bucketKey: '<String>', bucketTags: '<String>', databaseId: '<UUID>', enforceFk: '<Boolean>', fieldId: '<UUID>', isPublic: '<Boolean>', storageModuleId: '<UUID>', tableId: '<UUID>' });
```
