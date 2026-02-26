# orm-orgClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgClaimedInvite records

## Usage

```typescript
db.orgClaimedInvite.findMany({ select: { id: true } }).execute()
db.orgClaimedInvite.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.orgClaimedInvite.create({ data: { data: '<value>', senderId: '<value>', receiverId: '<value>', entityId: '<value>' }, select: { id: true } }).execute()
db.orgClaimedInvite.update({ where: { id: '<value>' }, data: { data: '<new>' }, select: { id: true } }).execute()
db.orgClaimedInvite.delete({ where: { id: '<value>' } }).execute()
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
  data: { data: 'value', senderId: 'value', receiverId: 'value', entityId: 'value' },
  select: { id: true }
}).execute();
```
