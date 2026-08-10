# orgProfileDefinitionGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from profile definitions

## Usage

```typescript
useOrgProfileDefinitionGrantsQuery({ selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, profileId: true, updatedAt: true } } })
useOrgProfileDefinitionGrantQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, profileId: true, updatedAt: true } } })
useCreateOrgProfileDefinitionGrantMutation({ selection: { fields: { id: true } } })
useUpdateOrgProfileDefinitionGrantMutation({ selection: { fields: { id: true } } })
useDeleteOrgProfileDefinitionGrantMutation({})
```

## Examples

### List all orgProfileDefinitionGrants

```typescript
const { data, isLoading } = useOrgProfileDefinitionGrantsQuery({
  selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, profileId: true, updatedAt: true } },
});
```

### Create a orgProfileDefinitionGrant

```typescript
const { mutate } = useCreateOrgProfileDefinitionGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', profileId: '<UUID>' });
```
