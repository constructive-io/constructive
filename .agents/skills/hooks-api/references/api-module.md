# apiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server

## Usage

```typescript
useApiModulesQuery({ selection: { fields: { apiId: true, data: true, databaseId: true, id: true, name: true } } })
useApiModuleQuery({ id: '<UUID>', selection: { fields: { apiId: true, data: true, databaseId: true, id: true, name: true } } })
useCreateApiModuleMutation({ selection: { fields: { id: true } } })
useUpdateApiModuleMutation({ selection: { fields: { id: true } } })
useDeleteApiModuleMutation({})
```

## Examples

### List all apiModules

```typescript
const { data, isLoading } = useApiModulesQuery({
  selection: { fields: { apiId: true, data: true, databaseId: true, id: true, name: true } },
});
```

### Create a apiModule

```typescript
const { mutate } = useCreateApiModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', data: '<JSON>', databaseId: '<UUID>', name: '<String>' });
```
