# myPendingAppInvitesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MyPendingAppInvitesRecord records

## Usage

```typescript
db.myPendingAppInvitesRecord.findMany({ select: { id: true } }).execute()
db.myPendingAppInvitesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.myPendingAppInvitesRecord.create({ data: { channel: '<String>', expiresAt: '<Datetime>', senderId: '<UUID>' }, select: { id: true } }).execute()
db.myPendingAppInvitesRecord.update({ where: { id: '<UUID>' }, data: { channel: '<String>' }, select: { id: true } }).execute()
db.myPendingAppInvitesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all myPendingAppInvitesRecord records

```typescript
const items = await db.myPendingAppInvitesRecord.findMany({
  select: { id: true, channel: true }
}).execute();
```

### Create a myPendingAppInvitesRecord

```typescript
const item = await db.myPendingAppInvitesRecord.create({
  data: { channel: '<String>', expiresAt: '<Datetime>', senderId: '<UUID>' },
  select: { id: true }
}).execute();
```
