# orgMembershipSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity settings for the memberships module

## Usage

```typescript
useOrgMembershipSettingsQuery({ selection: { fields: { allowExternalMembers: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, createChildCascadeOwners: true, createdAt: true, createdBy: true, createdByPrincipal: true, deleteMemberCascadeChildren: true, entityId: true, id: true, inviteProfileAssignmentMode: true, limitAllocationMode: true, populateMemberEmail: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useOrgMembershipSettingQuery({ id: '<UUID>', selection: { fields: { allowExternalMembers: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, createChildCascadeOwners: true, createdAt: true, createdBy: true, createdByPrincipal: true, deleteMemberCascadeChildren: true, entityId: true, id: true, inviteProfileAssignmentMode: true, limitAllocationMode: true, populateMemberEmail: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateOrgMembershipSettingMutation({ selection: { fields: { id: true } } })
useUpdateOrgMembershipSettingMutation({ selection: { fields: { id: true } } })
useDeleteOrgMembershipSettingMutation({})
```

## Examples

### List all orgMembershipSettings

```typescript
const { data, isLoading } = useOrgMembershipSettingsQuery({
  selection: { fields: { allowExternalMembers: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, createChildCascadeOwners: true, createdAt: true, createdBy: true, createdByPrincipal: true, deleteMemberCascadeChildren: true, entityId: true, id: true, inviteProfileAssignmentMode: true, limitAllocationMode: true, populateMemberEmail: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a orgMembershipSetting

```typescript
const { mutate } = useCreateOrgMembershipSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ allowExternalMembers: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', createChildCascadeOwners: '<Boolean>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', entityId: '<UUID>', inviteProfileAssignmentMode: '<String>', limitAllocationMode: '<String>', populateMemberEmail: '<Boolean>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
