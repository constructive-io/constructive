# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

OAuth and social login connections linking external service accounts to users

## Usage

```typescript
db.connectedAccount.findMany({ select: { id: true } }).execute()
db.connectedAccount.findOne({ id: '<value>', select: { id: true } }).execute()
db.connectedAccount.create({ data: { ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>', serviceTrgmSimilarity: '<value>', identifierTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.connectedAccount.update({ where: { id: '<value>' }, data: { ownerId: '<new>' }, select: { id: true } }).execute()
db.connectedAccount.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all connectedAccount records

```typescript
const items = await db.connectedAccount.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a connectedAccount

```typescript
const item = await db.connectedAccount.create({
  data: { ownerId: 'value', service: 'value', identifier: 'value', details: 'value', isVerified: 'value', serviceTrgmSimilarity: 'value', identifierTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
