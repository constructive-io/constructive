# orgProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named capability bundles (roles) that group multiple capabilities into reusable profiles

## Usage

```typescript
useOrgProfilesQuery({ selection: { fields: { capabilities: true, createdAt: true, description: true, entityId: true, id: true, isDefault: true, isSystem: true, name: true, slug: true, updatedAt: true } } })
useOrgProfileQuery({ id: '<UUID>', selection: { fields: { capabilities: true, createdAt: true, description: true, entityId: true, id: true, isDefault: true, isSystem: true, name: true, slug: true, updatedAt: true } } })
useCreateOrgProfileMutation({ selection: { fields: { id: true } } })
useUpdateOrgProfileMutation({ selection: { fields: { id: true } } })
useDeleteOrgProfileMutation({})
```

## Examples

### List all orgProfiles

```typescript
const { data, isLoading } = useOrgProfilesQuery({
  selection: { fields: { capabilities: true, createdAt: true, description: true, entityId: true, id: true, isDefault: true, isSystem: true, name: true, slug: true, updatedAt: true } },
});
```

### Create a orgProfile

```typescript
const { mutate } = useCreateOrgProfileMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilities: '<BitString>', description: '<String>', entityId: '<UUID>', isDefault: '<Boolean>', isSystem: '<Boolean>', name: '<String>', slug: '<String>' });
```
