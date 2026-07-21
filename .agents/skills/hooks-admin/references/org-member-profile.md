# orgMemberProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-membership profile information visible to other entity members (display name, email, title, bio, avatar)

## Usage

```typescript
useOrgMemberProfilesQuery({ selection: { fields: { actorId: true, bio: true, createdAt: true, displayName: true, email: true, entityId: true, id: true, membershipId: true, profilePicture: true, title: true, updatedAt: true } } })
useOrgMemberProfileQuery({ id: '<UUID>', selection: { fields: { actorId: true, bio: true, createdAt: true, displayName: true, email: true, entityId: true, id: true, membershipId: true, profilePicture: true, title: true, updatedAt: true } } })
useCreateOrgMemberProfileMutation({ selection: { fields: { id: true } } })
useUpdateOrgMemberProfileMutation({ selection: { fields: { id: true } } })
useDeleteOrgMemberProfileMutation({})
```

## Examples

### List all orgMemberProfiles

```typescript
const { data, isLoading } = useOrgMemberProfilesQuery({
  selection: { fields: { actorId: true, bio: true, createdAt: true, displayName: true, email: true, entityId: true, id: true, membershipId: true, profilePicture: true, title: true, updatedAt: true } },
});
```

### Create a orgMemberProfile

```typescript
const { mutate } = useCreateOrgMemberProfileMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', bio: '<String>', displayName: '<String>', email: '<String>', entityId: '<UUID>', membershipId: '<UUID>', profilePicture: '<Image>', title: '<String>' });
```
