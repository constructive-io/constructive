# siteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site

## Usage

```typescript
useSiteModulesQuery({ selection: { fields: { data: true, databaseId: true, id: true, name: true, siteId: true } } })
useSiteModuleQuery({ id: '<UUID>', selection: { fields: { data: true, databaseId: true, id: true, name: true, siteId: true } } })
useCreateSiteModuleMutation({ selection: { fields: { id: true } } })
useUpdateSiteModuleMutation({ selection: { fields: { id: true } } })
useDeleteSiteModuleMutation({})
```

## Examples

### List all siteModules

```typescript
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { data: true, databaseId: true, id: true, name: true, siteId: true } },
});
```

### Create a siteModule

```typescript
const { mutate } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', databaseId: '<UUID>', name: '<String>', siteId: '<UUID>' });
```
