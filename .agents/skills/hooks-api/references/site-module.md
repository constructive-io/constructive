# siteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Frontend module configuration for a site surface; stores module name and JSON settings

## Usage

```typescript
useSiteModulesQuery({ selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, name: true, siteId: true, updatedAt: true } } })
useSiteModuleQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, name: true, siteId: true, updatedAt: true } } })
useCreateSiteModuleMutation({ selection: { fields: { id: true } } })
useUpdateSiteModuleMutation({ selection: { fields: { id: true } } })
useDeleteSiteModuleMutation({})
```

## Examples

### List all siteModules

```typescript
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, name: true, siteId: true, updatedAt: true } },
});
```

### Create a siteModule

```typescript
const { mutate } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', databaseId: '<UUID>', name: '<String>', siteId: '<UUID>' });
```
