# orgClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
db.orgClaimedInvite.findMany({ select: { id: true } }).execute()
db.orgClaimedInvite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgClaimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.orgClaimedInvite.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgClaimedInvite records

```typescript
const items = await db.orgClaimedInvite.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a orgClaimedInvite

```typescript
const item = await db.orgClaimedInvite.create({
  data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
