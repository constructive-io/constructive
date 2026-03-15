# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TableGrant records

## Usage

```typescript
db.tableGrant.findMany({ select: { id: true } }).execute()
db.tableGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.tableGrant.create({ data: { databaseId: '<value>', tableId: '<value>', privilege: '<value>', granteeName: '<value>', fieldIds: '<value>', isGrant: '<value>', privilegeTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.tableGrant.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.tableGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all tableGrant records

```typescript
const items = await db.tableGrant.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a tableGrant

```typescript
const item = await db.tableGrant.create({
  data: { databaseId: 'value', tableId: 'value', privilege: 'value', granteeName: 'value', fieldIds: 'value', isGrant: 'value', privilegeTrgmSimilarity: 'value', granteeNameTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
