# hooks-siteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SiteModule data operations

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
