# hooks-index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Index data operations

## Usage

```typescript
useIndicesQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useIndexQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateIndexMutation({ selection: { fields: { id: true } } })
useUpdateIndexMutation({ selection: { fields: { id: true } } })
useDeleteIndexMutation({})
```

## Examples

### List all indices

```typescript
const { data, isLoading } = useIndicesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, fieldIds: true, includeFieldIds: true, accessMethod: true, indexParams: true, whereClause: true, isUnique: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a index

```typescript
const { mutate } = useCreateIndexMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', tableId: '<value>', name: '<value>', fieldIds: '<value>', includeFieldIds: '<value>', accessMethod: '<value>', indexParams: '<value>', whereClause: '<value>', isUnique: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```
