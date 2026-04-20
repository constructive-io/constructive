# orgMembershipSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity settings for the memberships module

## Usage

```typescript
useOrgMembershipSettingsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, populateMemberEmail: true } } })
useOrgMembershipSettingQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, populateMemberEmail: true } } })
useCreateOrgMembershipSettingMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipSettingMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipSettingMutation({})
```

## Examples

### List all orgMembershipSettings

```typescript
const { data, isLoading } = useOrgMembershipSettingsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, populateMemberEmail: true } },
});
```

### Create a orgMembershipSetting

```typescript
const { mutate } = useCreateOrgMembershipSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', populateMemberEmail: '<Boolean>' });
```
