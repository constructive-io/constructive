# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Cryptocurrency wallet addresses owned by users, with network-specific validation and verification

## Usage

```typescript
db.cryptoAddress.findMany({ select: { id: true } }).execute()
db.cryptoAddress.findOne({ id: '<value>', select: { id: true } }).execute()
db.cryptoAddress.create({ data: { ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>', addressTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.cryptoAddress.update({ where: { id: '<value>' }, data: { ownerId: '<new>' }, select: { id: true } }).execute()
db.cryptoAddress.delete({ where: { id: '<value>' } }).execute()
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
  data: { ownerId: 'value', address: 'value', isVerified: 'value', isPrimary: 'value', addressTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
