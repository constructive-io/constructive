# appClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
db.appClaimedInvite.findMany({ select: { id: true } }).execute()
db.appClaimedInvite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appClaimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' }, select: { id: true } }).execute()
db.appClaimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.appClaimedInvite.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appClaimedInvite records

```typescript
const items = await db.appClaimedInvite.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a appClaimedInvite

```typescript
const item = await db.appClaimedInvite.create({
  data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' },
  select: { id: true }
}).execute();
```
