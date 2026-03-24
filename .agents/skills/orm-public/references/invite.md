# invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
db.invite.findMany({ select: { id: true } }).execute()
db.invite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.invite.create({ data: { email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' }, select: { id: true } }).execute()
db.invite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute()
db.invite.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
