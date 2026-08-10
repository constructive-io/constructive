# appProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named capability bundles (roles) that group multiple capabilities into reusable profiles

## Usage

```typescript
useAppProfilesQuery({ selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, isSystem: true, name: true, slug: true, updatedAt: true } } })
useAppProfileQuery({ id: '<UUID>', selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, isSystem: true, name: true, slug: true, updatedAt: true } } })
useCreateAppProfileMutation({ selection: { fields: { id: true } } })
useUpdateAppProfileMutation({ selection: { fields: { id: true } } })
useDeleteAppProfileMutation({})
```

## Examples

### List all appProfiles

```typescript
const { data, isLoading } = useAppProfilesQuery({
  selection: { fields: { capabilities: true, createdAt: true, description: true, id: true, isDefault: true, isSystem: true, name: true, slug: true, updatedAt: true } },
});
```

### Create a appProfile

```typescript
const { mutate } = useCreateAppProfileMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', isSystem: '<Boolean>', name: '<String>', slug: '<String>' });
```
