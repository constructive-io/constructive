# orgMembershipProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Every profile a membership holds; memberships.profile_id points at one of them

## Usage

```typescript
useOrgMembershipProfilesQuery({ selection: { fields: { actorId: true, createdAt: true, id: true, membershipId: true, profileId: true, updatedAt: true } } })
useOrgMembershipProfileQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, id: true, membershipId: true, profileId: true, updatedAt: true } } })
useCreateOrgMembershipProfileMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipProfileMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipProfileMutation({})
```

## Examples

### List all orgMembershipProfiles

```typescript
const { data, isLoading } = useOrgMembershipProfilesQuery({
  selection: { fields: { actorId: true, createdAt: true, id: true, membershipId: true, profileId: true, updatedAt: true } },
});
```

### Create a orgMembershipProfile

```typescript
const { mutate } = useCreateOrgMembershipProfileMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', membershipId: '<UUID>', profileId: '<UUID>' });
```
