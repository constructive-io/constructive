# orgLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants that automatically update limit ceilings

## Usage

```typescript
db.orgLimitCredit.findMany({ select: { id: true } }).execute()
db.orgLimitCredit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitCredit.create({ data: { defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' }, select: { id: true } }).execute()
db.orgLimitCredit.update({ where: { id: '<UUID>' }, data: { defaultLimitId: '<UUID>' }, select: { id: true } }).execute()
db.orgLimitCredit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitCredit records

```typescript
const items = await db.orgLimitCredit.findMany({
  select: { id: true, defaultLimitId: true }
}).execute();
```

### Create a orgLimitCredit

```typescript
const item = await db.orgLimitCredit.create({
  data: { defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' },
  select: { id: true }
}).execute();
```
