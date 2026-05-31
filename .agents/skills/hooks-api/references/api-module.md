# apiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Server-side module configuration for an API endpoint; stores module name and JSON settings used by the application server

## Usage

```typescript
useApiModulesQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } } })
useApiModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, apiId: true, name: true, data: true } } })
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
mutate({ databaseId: '<UUID>', apiId: '<UUID>', name: '<String>', data: '<JSON>' });
```
