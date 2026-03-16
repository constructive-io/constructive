# viewGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ViewGrant data operations

## Usage

```typescript
useViewGrantsQuery({ selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, searchScore: true } } })
useViewGrantQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, searchScore: true } } })
useCreateViewGrantMutation({ selection: { fields: { id: true } } })
useUpdateViewGrantMutation({ selection: { fields: { id: true } } })
useDeleteViewGrantMutation({})
```

## Examples

### List all viewGrants

```typescript
const { data, isLoading } = useViewGrantsQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, granteeName: true, privilege: true, withGrantOption: true, isGrant: true, granteeNameTrgmSimilarity: true, privilegeTrgmSimilarity: true, searchScore: true } },
});
```

### Create a viewGrant

```typescript
const { mutate } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', viewId: '<value>', granteeName: '<value>', privilege: '<value>', withGrantOption: '<value>', isGrant: '<value>', granteeNameTrgmSimilarity: '<value>', privilegeTrgmSimilarity: '<value>', searchScore: '<value>' });
```
