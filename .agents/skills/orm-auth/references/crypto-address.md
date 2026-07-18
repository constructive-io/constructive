# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Cryptocurrency wallet addresses owned by users, with network-specific validation and verification

## Usage

```typescript
db.cryptoAddress.findMany({ select: { id: true } }).execute()
db.cryptoAddress.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.cryptoAddress.create({ data: { address: '<String>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', ownerId: '<UUID>' }, select: { id: true } }).execute()
db.cryptoAddress.update({ where: { id: '<UUID>' }, data: { address: '<String>' }, select: { id: true } }).execute()
db.cryptoAddress.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all cryptoAddress records

```typescript
const items = await db.cryptoAddress.findMany({
  select: { id: true, address: true }
}).execute();
```

### Create a cryptoAddress

```typescript
const item = await db.cryptoAddress.create({
  data: { address: '<String>', isPrimary: '<Boolean>', isVerified: '<Boolean>', name: '<String>', ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
