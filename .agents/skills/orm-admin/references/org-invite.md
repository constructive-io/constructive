# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Invitation records sent to prospective members via email, with token-based redemption and expiration

## Usage

```typescript
db.orgInvite.findMany({ select: { id: true } }).execute()
db.orgInvite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgInvite.create({ data: { email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgInvite.update({ where: { id: '<UUID>' }, data: { email: '<Email>' }, select: { id: true } }).execute()
db.orgInvite.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', expiresAt: '<Datetime>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
