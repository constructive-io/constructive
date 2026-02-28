# hooks-defaultIdsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DefaultIdsModule data operations

## Usage

```typescript
useDefaultIdsModulesQuery({ selection: { fields: { id: true, databaseId: true } } })
useDefaultIdsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true } } })
useCreateDefaultIdsModuleMutation({ selection: { fields: { id: true } } })
useUpdateDefaultIdsModuleMutation({ selection: { fields: { id: true } } })
useDeleteDefaultIdsModuleMutation({})
```

## Examples

### List all defaultIdsModules

```typescript
const { data, isLoading } = useDefaultIdsModulesQuery({
  selection: { fields: { id: true, databaseId: true } },
});
```

### Create a defaultIdsModule

```typescript
const { mutate } = useCreateDefaultIdsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>' });
```
