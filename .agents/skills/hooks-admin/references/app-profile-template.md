# appProfileTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Template profiles that are automatically seeded into new entities when created

## Usage

```typescript
useAppProfileTemplatesQuery({ selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, name: true, slug: true, updatedAt: true } } })
useAppProfileTemplateQuery({ id: '<UUID>', selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, name: true, slug: true, updatedAt: true } } })
useCreateAppProfileTemplateMutation({ selection: { fields: { id: true } } })
useUpdateAppProfileTemplateMutation({ selection: { fields: { id: true } } })
useDeleteAppProfileTemplateMutation({})
```

## Examples

### List all appProfileTemplates

```typescript
const { data, isLoading } = useAppProfileTemplatesQuery({
  selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, name: true, slug: true, updatedAt: true } },
});
```

### Create a appProfileTemplate

```typescript
const { mutate } = useCreateAppProfileTemplateMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', name: '<String>', slug: '<String>' });
```
