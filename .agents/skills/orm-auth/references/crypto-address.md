# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Cryptocurrency wallet addresses owned by users, with network-specific validation and verification

## Usage

```typescript
db.cryptoAddress.findMany({ select: { id: true } }).execute()
db.cryptoAddress.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.cryptoAddress.create({ data: { ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' }, select: { id: true } }).execute()
db.cryptoAddress.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.cryptoAddress.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all cryptoAddress records

```typescript
const items = await db.cryptoAddress.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a cryptoAddress

```typescript
const item = await db.cryptoAddress.create({
  data: { ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' },
  select: { id: true }
}).execute();
```
