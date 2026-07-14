# appInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
db.appInvite.findMany({ select: { id: true } }).execute()
db.appInvite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appInvite.create({ data: { channel: '<String>', data: '<JSON>', email: '<Email>', expiresAt: '<Datetime>', inviteCount: '<Int>', inviteLimit: '<Int>', inviteToken: '<String>', inviteValid: '<Boolean>', multiple: '<Boolean>', phone: '<String>', profileId: '<UUID>', senderId: '<UUID>' }, select: { id: true } }).execute()
db.appInvite.update({ where: { id: '<UUID>' }, data: { channel: '<String>' }, select: { id: true } }).execute()
db.appInvite.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appInvite records

```typescript
const items = await db.appInvite.findMany({
  select: { id: true, channel: true }
}).execute();
```

### Create a appInvite

```typescript
const item = await db.appInvite.create({
  data: { channel: '<String>', data: '<JSON>', email: '<Email>', expiresAt: '<Datetime>', inviteCount: '<Int>', inviteLimit: '<Int>', inviteToken: '<String>', inviteValid: '<Boolean>', multiple: '<Boolean>', phone: '<String>', profileId: '<UUID>', senderId: '<UUID>' },
  select: { id: true }
}).execute();
```
