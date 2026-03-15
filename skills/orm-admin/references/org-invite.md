# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
db.orgInvite.findMany({ select: { id: true } }).execute()
db.orgInvite.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgInvite.create({ data: { email: '<value>', senderId: '<value>', receiverId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', entityId: '<value>', inviteTokenTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.orgInvite.update({ where: { id: '<value>' }, data: { email: '<new>' }, select: { id: true } }).execute()
db.orgInvite.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgInvite records

```typescript
const items = await db.orgInvite.findMany({
  select: { id: true, email: true }
}).execute();
```

### Create a orgInvite

```typescript
const item = await db.orgInvite.create({
  data: { email: 'value', senderId: 'value', receiverId: 'value', inviteToken: 'value', inviteValid: 'value', inviteLimit: 'value', inviteCount: 'value', multiple: 'value', data: 'value', expiresAt: 'value', entityId: 'value', inviteTokenTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
