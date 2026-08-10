# emailIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Outbound sender identity: the from/reply-to/support addresses a tenant sends as, and the provider account the mail leaves through

## Usage

```typescript
db.emailIdentity.findMany({ select: { id: true } }).execute()
db.emailIdentity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.emailIdentity.create({ data: { databaseId: '<UUID>', fromAddress: '<String>', fromName: '<String>', isActive: '<Boolean>', isDefault: '<Boolean>', name: '<String>', providerAccountId: '<UUID>', replyToAddress: '<String>', supportAddress: '<String>', transportMode: '<String>' }, select: { id: true } }).execute()
db.emailIdentity.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.emailIdentity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all emailIdentity records

```typescript
const items = await db.emailIdentity.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a emailIdentity

```typescript
const item = await db.emailIdentity.create({
  data: { databaseId: '<UUID>', fromAddress: '<String>', fromName: '<String>', isActive: '<Boolean>', isDefault: '<Boolean>', name: '<String>', providerAccountId: '<UUID>', replyToAddress: '<String>', supportAddress: '<String>', transportMode: '<String>' },
  select: { id: true }
}).execute();
```
