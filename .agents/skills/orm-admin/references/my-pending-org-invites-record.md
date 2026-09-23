# myPendingOrgInvitesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MyPendingOrgInvitesRecord records

## Usage

```typescript
db.myPendingOrgInvitesRecord.findMany({ select: { id: true } }).execute()
db.myPendingOrgInvitesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.myPendingOrgInvitesRecord.create({ data: { channel: '<String>', entityId: '<UUID>', expiresAt: '<Datetime>', senderId: '<UUID>' }, select: { id: true } }).execute()
db.myPendingOrgInvitesRecord.update({ where: { id: '<UUID>' }, data: { channel: '<String>' }, select: { id: true } }).execute()
db.myPendingOrgInvitesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all myPendingOrgInvitesRecord records

```typescript
const items = await db.myPendingOrgInvitesRecord.findMany({
  select: { id: true, channel: true }
}).execute();
```

### Create a myPendingOrgInvitesRecord

```typescript
const item = await db.myPendingOrgInvitesRecord.create({
  data: { channel: '<String>', entityId: '<UUID>', expiresAt: '<Datetime>', senderId: '<UUID>' },
  select: { id: true }
}).execute();
```
