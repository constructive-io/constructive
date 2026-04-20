# orgMembershipSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity settings for the memberships module

## Usage

```typescript
db.orgMembershipSetting.findMany({ select: { id: true } }).execute()
db.orgMembershipSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMembershipSetting.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', populateMemberEmail: '<Boolean>' }, select: { id: true } }).execute()
db.orgMembershipSetting.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.orgMembershipSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMembershipSetting records

```typescript
const items = await db.orgMembershipSetting.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a orgMembershipSetting

```typescript
const item = await db.orgMembershipSetting.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', populateMemberEmail: '<Boolean>' },
  select: { id: true }
}).execute();
```
