# meterCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants for billing meters that automatically update balances

## Usage

```typescript
db.meterCredit.findMany({ select: { id: true } }).execute()
db.meterCredit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.meterCredit.create({ data: { amount: '<BigInt>', creditType: '<String>', entityId: '<UUID>', entityType: '<String>', expiresAt: '<Datetime>', meterId: '<UUID>', organizationId: '<UUID>', reason: '<String>' }, select: { id: true } }).execute()
db.meterCredit.update({ where: { id: '<UUID>' }, data: { amount: '<BigInt>' }, select: { id: true } }).execute()
db.meterCredit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all meterCredit records

```typescript
const items = await db.meterCredit.findMany({
  select: { id: true, amount: true }
}).execute();
```

### Create a meterCredit

```typescript
const item = await db.meterCredit.create({
  data: { amount: '<BigInt>', creditType: '<String>', entityId: '<UUID>', entityType: '<String>', expiresAt: '<Datetime>', meterId: '<UUID>', organizationId: '<UUID>', reason: '<String>' },
  select: { id: true }
}).execute();
```
