# claimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of successfully claimed invitations, linking senders to receivers

## Usage

```typescript
db.claimedInvite.findMany({ select: { id: true } }).execute()
db.claimedInvite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.claimedInvite.create({ data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' }, select: { id: true } }).execute()
db.claimedInvite.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.claimedInvite.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all claimedInvite records

```typescript
const items = await db.claimedInvite.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a claimedInvite

```typescript
const item = await db.claimedInvite.create({
  data: { data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' },
  select: { id: true }
}).execute();
```
