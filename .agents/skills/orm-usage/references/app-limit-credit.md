# appLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants that automatically update limit ceilings

## Usage

```typescript
db.appLimitCredit.findMany({ select: { id: true } }).execute()
db.appLimitCredit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitCredit.create({ data: { actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute()
db.appLimitCredit.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appLimitCredit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitCredit records

```typescript
const items = await db.appLimitCredit.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appLimitCredit

```typescript
const item = await db.appLimitCredit.create({
  data: { actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', reason: '<String>' },
  select: { id: true }
}).execute();
```
