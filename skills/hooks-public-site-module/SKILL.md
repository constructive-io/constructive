---
name: hooks-public-site-module
description: Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site
---

# hooks-public-site-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site-level module configuration; stores module name and JSON settings used by the frontend or server for each site

## Usage

```typescript
useSiteModulesQuery({ selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } } })
useSiteModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } } })
useCreateSiteModuleMutation({ selection: { fields: { id: true } } })
useUpdateSiteModuleMutation({ selection: { fields: { id: true } } })
useDeleteSiteModuleMutation({})
```

## Examples

### List all siteModules

```typescript
const { data, isLoading } = useSiteModulesQuery({
  selection: { fields: { id: true, databaseId: true, siteId: true, name: true, data: true } },
});
```

### Create a siteModule

```typescript
const { mutate } = useCreateSiteModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', siteId: '<value>', name: '<value>', data: '<value>' });
```
