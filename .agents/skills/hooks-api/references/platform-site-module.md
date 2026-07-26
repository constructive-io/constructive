# platformSiteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Frontend module configuration for a site surface; stores module name and JSON settings

## Usage

```typescript
usePlatformSiteModulesQuery({ selection: { fields: { createdAt: true, data: true, id: true, name: true, siteId: true, updatedAt: true } } })
usePlatformSiteModuleQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, id: true, name: true, siteId: true, updatedAt: true } } })
useCreatePlatformSiteModuleMutation({ selection: { fields: { id: true } } })
useUpdatePlatformSiteModuleMutation({ selection: { fields: { id: true } } })
useDeletePlatformSiteModuleMutation({})
```

## Examples

### List all platformSiteModules

```typescript
const { data, isLoading } = usePlatformSiteModulesQuery({
  selection: { fields: { createdAt: true, data: true, id: true, name: true, siteId: true, updatedAt: true } },
});
```

### Create a platformSiteModule

```typescript
const { mutate } = useCreatePlatformSiteModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', name: '<String>', siteId: '<UUID>' });
```
