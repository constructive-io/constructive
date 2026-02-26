# orm-claimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ClaimedInvite records

## Usage

```typescript
db.claimedInvite.findMany({ select: { id: true } }).execute()
db.claimedInvite.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.claimedInvite.create({ data: { data: '<value>', senderId: '<value>', receiverId: '<value>' }, select: { id: true } }).execute()
db.claimedInvite.update({ where: { id: '<value>' }, data: { data: '<new>' }, select: { id: true } }).execute()
db.claimedInvite.delete({ where: { id: '<value>' } }).execute()
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
  data: { data: 'value', senderId: 'value', receiverId: 'value' },
  select: { id: true }
}).execute();
```
