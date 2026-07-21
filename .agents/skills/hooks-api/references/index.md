# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Index data operations

## Usage

```typescript
useIndicesQuery({ selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } } })
useIndexQuery({ id: '<UUID>', selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } } })
useCreateIndexMutation({ selection: { fields: { id: true } } })
useUpdateIndexMutation({ selection: { fields: { id: true } } })
useDeleteIndexMutation({})
```

## Examples

### List all indices

```typescript
const { data, isLoading } = useIndicesQuery({
  selection: { fields: { accessMethod: true, category: true, createdAt: true, databaseId: true, fieldIds: true, id: true, includeFieldIds: true, indexParams: true, isUnique: true, name: true, opClasses: true, options: true, smartTags: true, tableId: true, tags: true, updatedAt: true, whereClause: true } },
});
```

### Create a index

```typescript
const { mutate } = useCreateIndexMutation({
  selection: { fields: { id: true } },
});
mutate({ accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', indexParams: '<JSON>', isUnique: '<Boolean>', name: '<String>', opClasses: '<String>', options: '<JSON>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', whereClause: '<JSON>' });
```
