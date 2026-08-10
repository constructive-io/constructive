# orgProfileTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Template profiles that are automatically seeded into new entities when created

## Usage

```typescript
useOrgProfileTemplatesQuery({ selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, name: true, slug: true, updatedAt: true } } })
useOrgProfileTemplateQuery({ id: '<UUID>', selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, name: true, slug: true, updatedAt: true } } })
useCreateOrgProfileTemplateMutation({ selection: { fields: { id: true } } })
useUpdateOrgProfileTemplateMutation({ selection: { fields: { id: true } } })
useDeleteOrgProfileTemplateMutation({})
```

## Examples

### List all orgProfileTemplates

```typescript
const { data, isLoading } = useOrgProfileTemplatesQuery({
  selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, name: true, slug: true, updatedAt: true } },
});
```

### Create a orgProfileTemplate

```typescript
const { mutate } = useCreateOrgProfileTemplateMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', name: '<String>', slug: '<String>' });
```
