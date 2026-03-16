# invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
db.invite.findMany({ select: { id: true } }).execute()
db.invite.findOne({ id: '<value>', select: { id: true } }).execute()
db.invite.create({ data: { email: '<value>', senderId: '<value>', inviteToken: '<value>', inviteValid: '<value>', inviteLimit: '<value>', inviteCount: '<value>', multiple: '<value>', data: '<value>', expiresAt: '<value>', inviteTokenTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.invite.update({ where: { id: '<value>' }, data: { email: '<new>' }, select: { id: true } }).execute()
db.invite.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all invite records

```typescript
const items = await db.invite.findMany({
  select: { id: true, email: true }
}).execute();
```

### Create a invite

```typescript
const item = await db.invite.create({
  data: { email: 'value', senderId: 'value', inviteToken: 'value', inviteValid: 'value', inviteLimit: 'value', inviteCount: 'value', multiple: 'value', data: 'value', expiresAt: 'value', inviteTokenTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
