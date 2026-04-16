# appInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
db.appInvite.findMany({ select: { id: true } }).execute()
db.appInvite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appInvite.create({ data: { email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' }, select: { id: true } }).execute()
db.appInvite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute()
db.appInvite.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appInvite records

```typescript
const items = await db.appInvite.findMany({
  select: { id: true, email: true }
}).execute();
```

### Create a appInvite

```typescript
const item = await db.appInvite.create({
  data: { email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
