# appProfileDefinitionGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from profile definitions

## Usage

```typescript
useAppProfileDefinitionGrantsQuery({ selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, profileId: true, updatedAt: true } } })
useAppProfileDefinitionGrantQuery({ id: '<UUID>', selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, profileId: true, updatedAt: true } } })
useCreateAppProfileDefinitionGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppProfileDefinitionGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppProfileDefinitionGrantMutation({})
```

## Examples

### List all appProfileDefinitionGrants

```typescript
const { data, isLoading } = useAppProfileDefinitionGrantsQuery({
  selection: { fields: { capabilityId: true, createdAt: true, grantorId: true, id: true, isGrant: true, profileId: true, updatedAt: true } },
});
```

### Create a appProfileDefinitionGrant

```typescript
const { mutate } = useCreateAppProfileDefinitionGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', profileId: '<UUID>' });
```
