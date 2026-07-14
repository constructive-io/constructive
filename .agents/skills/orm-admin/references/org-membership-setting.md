# orgMembershipSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity settings for the memberships module

## Usage

```typescript
db.orgMembershipSetting.findMany({ select: { id: true } }).execute()
db.orgMembershipSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMembershipSetting.create({ data: { allowExternalMembers: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', createChildCascadeOwners: '<Boolean>', createdBy: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', entityId: '<UUID>', inviteProfileAssignmentMode: '<String>', limitAllocationMode: '<String>', populateMemberEmail: '<Boolean>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.orgMembershipSetting.update({ where: { id: '<UUID>' }, data: { allowExternalMembers: '<Boolean>' }, select: { id: true } }).execute()
db.orgMembershipSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMembershipSetting records

```typescript
const items = await db.orgMembershipSetting.findMany({
  select: { id: true, allowExternalMembers: true }
}).execute();
```

### Create a orgMembershipSetting

```typescript
const item = await db.orgMembershipSetting.create({
  data: { allowExternalMembers: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', createChildCascadeOwners: '<Boolean>', createdBy: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', entityId: '<UUID>', inviteProfileAssignmentMode: '<String>', limitAllocationMode: '<String>', populateMemberEmail: '<Boolean>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
