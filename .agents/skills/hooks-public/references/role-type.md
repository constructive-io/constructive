# roleType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RoleType data operations

## Usage

```typescript
useRoleTypesQuery({ selection: { fields: { id: true, name: true } } })
useRoleTypeQuery({ id: '<Int>', selection: { fields: { id: true, name: true } } })
useCreateRoleTypeMutation({ selection: { fields: { id: true } } })
useUpdateRoleTypeMutation({ selection: { fields: { id: true } } })
useDeleteRoleTypeMutation({})
```

## Examples

### List all roleTypes

```typescript
const { data, isLoading } = useRoleTypesQuery({
  selection: { fields: { id: true, name: true } },
});
```

### Create a roleType

```typescript
const { mutate } = useCreateRoleTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>' });
```
