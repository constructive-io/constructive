# platformEmailIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Outbound sender identity: the from/reply-to/support addresses a tenant sends as, and the provider account the mail leaves through

## Usage

```typescript
db.platformEmailIdentity.findMany({ select: { id: true } }).execute()
db.platformEmailIdentity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformEmailIdentity.create({ data: { fromAddress: '<String>', fromName: '<String>', isActive: '<Boolean>', isDefault: '<Boolean>', name: '<String>', providerAccountId: '<UUID>', replyToAddress: '<String>', supportAddress: '<String>', transportMode: '<String>' }, select: { id: true } }).execute()
db.platformEmailIdentity.update({ where: { id: '<UUID>' }, data: { fromAddress: '<String>' }, select: { id: true } }).execute()
db.platformEmailIdentity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformEmailIdentity records

```typescript
const items = await db.platformEmailIdentity.findMany({
  select: { id: true, fromAddress: true }
}).execute();
```

### Create a platformEmailIdentity

```typescript
const item = await db.platformEmailIdentity.create({
  data: { fromAddress: '<String>', fromName: '<String>', isActive: '<Boolean>', isDefault: '<Boolean>', name: '<String>', providerAccountId: '<UUID>', replyToAddress: '<String>', supportAddress: '<String>', transportMode: '<String>' },
  select: { id: true }
}).execute();
```
