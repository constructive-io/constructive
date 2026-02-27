# orm-cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CryptoAddress records

## Usage

```typescript
db.cryptoAddress.findMany({ select: { id: true } }).execute()
db.cryptoAddress.findOne({ id: '<value>', select: { id: true } }).execute()
db.cryptoAddress.create({ data: { ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>' }, select: { id: true } }).execute()
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
  data: { ownerId: 'value', address: 'value', isVerified: 'value', isPrimary: 'value' },
  select: { id: true }
}).execute();
```
