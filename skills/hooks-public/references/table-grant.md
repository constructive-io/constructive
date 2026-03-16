# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TableGrant data operations

## Usage

```typescript
useTableGrantsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } } })
useTableGrantQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } } })
useCreateTableGrantMutation({ selection: { fields: { id: true } } })
useUpdateTableGrantMutation({ selection: { fields: { id: true } } })
useDeleteTableGrantMutation({})
```

## Examples

### List all tableGrants

```typescript
const { data, isLoading } = useTableGrantsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, privilege: true, granteeName: true, fieldIds: true, isGrant: true, createdAt: true, updatedAt: true, privilegeTrgmSimilarity: true, granteeNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a tableGrant

```typescript
const { mutate } = useCreateTableGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', tableId: '<value>', privilege: '<value>', granteeName: '<value>', fieldIds: '<value>', isGrant: '<value>', privilegeTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
