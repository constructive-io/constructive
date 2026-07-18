# viewGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ViewGrant data operations

## Usage

```typescript
useViewGrantsQuery({ selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } } })
useViewGrantQuery({ id: '<UUID>', selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } } })
useCreateViewGrantMutation({ selection: { fields: { id: true } } })
useUpdateViewGrantMutation({ selection: { fields: { id: true } } })
useDeleteViewGrantMutation({})
```

## Examples

### List all viewGrants

```typescript
const { data, isLoading } = useViewGrantsQuery({
  selection: { fields: { databaseId: true, granteeName: true, id: true, isGrant: true, privilege: true, viewId: true, withGrantOption: true } },
});
```

### Create a viewGrant

```typescript
const { mutate } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', privilege: '<String>', viewId: '<UUID>', withGrantOption: '<Boolean>' });
```
