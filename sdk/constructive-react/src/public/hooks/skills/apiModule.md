# hooks-apiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ApiModule data operations

## Usage

```typescript
useApiModulesQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } } })
useApiModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } } })
useCreateApiModuleMutation({ selection: { fields: { id: true } } })
useUpdateApiModuleMutation({ selection: { fields: { id: true } } })
useDeleteApiModuleMutation({})
```

## Examples

### List all apiModules

```typescript
const { data, isLoading } = useApiModulesQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } },
});
```

### Create a apiModule

```typescript
const { mutate } = useCreateApiModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', apiId: '<value>', name: '<value>', data: '<value>' });
```
