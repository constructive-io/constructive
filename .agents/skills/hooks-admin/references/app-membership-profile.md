# appMembershipProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Every profile a membership holds; memberships.profile_id points at one of them

## Usage

```typescript
useAppMembershipProfilesQuery({ selection: { fields: { actorId: true, createdAt: true, id: true, membershipId: true, profileId: true, updatedAt: true } } })
useAppMembershipProfileQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, id: true, membershipId: true, profileId: true, updatedAt: true } } })
useCreateAppMembershipProfileMutation({ selection: { fields: { id: true } } })
useUpdateAppMembershipProfileMutation({ selection: { fields: { id: true } } })
useDeleteAppMembershipProfileMutation({})
```

## Examples

### List all appMembershipProfiles

```typescript
const { data, isLoading } = useAppMembershipProfilesQuery({
  selection: { fields: { actorId: true, createdAt: true, id: true, membershipId: true, profileId: true, updatedAt: true } },
});
```

### Create a appMembershipProfile

```typescript
const { mutate } = useCreateAppMembershipProfileMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', membershipId: '<UUID>', profileId: '<UUID>' });
```
