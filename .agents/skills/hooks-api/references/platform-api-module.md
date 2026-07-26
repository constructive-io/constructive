# platformApiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Server-side module configuration for an API surface; stores module name and JSON settings

## Usage

```typescript
usePlatformApiModulesQuery({ selection: { fields: { apiId: true, createdAt: true, data: true, id: true, name: true, updatedAt: true } } })
usePlatformApiModuleQuery({ id: '<UUID>', selection: { fields: { apiId: true, createdAt: true, data: true, id: true, name: true, updatedAt: true } } })
useCreatePlatformApiModuleMutation({ selection: { fields: { id: true } } })
useUpdatePlatformApiModuleMutation({ selection: { fields: { id: true } } })
useDeletePlatformApiModuleMutation({})
```

## Examples

### List all platformApiModules

```typescript
const { data, isLoading } = usePlatformApiModulesQuery({
  selection: { fields: { apiId: true, createdAt: true, data: true, id: true, name: true, updatedAt: true } },
});
```

### Create a platformApiModule

```typescript
const { mutate } = useCreatePlatformApiModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', data: '<JSON>', name: '<String>' });
```
