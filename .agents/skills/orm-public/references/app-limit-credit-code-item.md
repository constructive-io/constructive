# appLimitCreditCodeItem

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Items within a credit code — each row grants credits for a specific limit definition

## Usage

```typescript
db.appLimitCreditCodeItem.findMany({ select: { id: true } }).execute()
db.appLimitCreditCodeItem.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitCreditCodeItem.create({ data: { creditCodeId: '<UUID>', defaultLimitId: '<UUID>', amount: '<BigInt>', creditType: '<String>' }, select: { id: true } }).execute()
db.appLimitCreditCodeItem.update({ where: { id: '<UUID>' }, data: { creditCodeId: '<UUID>' }, select: { id: true } }).execute()
db.appLimitCreditCodeItem.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitCreditCodeItem records

```typescript
const items = await db.appLimitCreditCodeItem.findMany({
  select: { id: true, creditCodeId: true }
}).execute();
```

### Create a appLimitCreditCodeItem

```typescript
const item = await db.appLimitCreditCodeItem.create({
  data: { creditCodeId: '<UUID>', defaultLimitId: '<UUID>', amount: '<BigInt>', creditType: '<String>' },
  select: { id: true }
}).execute();
```
