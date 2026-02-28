# hooks-viewGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ViewGrant data operations

## Usage

```typescript
useViewGrantsQuery({ selection: { fields: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } } })
useViewGrantQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } } })
useCreateViewGrantMutation({ selection: { fields: { id: true } } })
useUpdateViewGrantMutation({ selection: { fields: { id: true } } })
useDeleteViewGrantMutation({})
```

## Examples

### List all viewGrants

```typescript
const { data, isLoading } = useViewGrantsQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, roleName: true, privilege: true, withGrantOption: true } },
});
```

### Create a viewGrant

```typescript
const { mutate } = useCreateViewGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', viewId: '<value>', roleName: '<value>', privilege: '<value>', withGrantOption: '<value>' });
```
