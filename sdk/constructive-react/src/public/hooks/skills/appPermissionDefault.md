# hooks-appPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppPermissionDefault data operations

## Usage

```typescript
useAppPermissionDefaultsQuery({ selection: { fields: { id: true, permissions: true } } })
useAppPermissionDefaultQuery({ id: '<value>', selection: { fields: { id: true, permissions: true } } })
useCreateAppPermissionDefaultMutation({ selection: { fields: { id: true } } })
useUpdateAppPermissionDefaultMutation({ selection: { fields: { id: true } } })
useDeleteAppPermissionDefaultMutation({})
```

## Examples

### List all appPermissionDefaults

```typescript
const { data, isLoading } = useAppPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true } },
});
```

### Create a appPermissionDefault

```typescript
const { mutate } = useCreateAppPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
mutate({ permissions: '<value>' });
```
