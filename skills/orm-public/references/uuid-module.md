# uuidModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UuidModule records

## Usage

```typescript
db.uuidModule.findMany({ select: { id: true } }).execute()
db.uuidModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.uuidModule.create({ data: { databaseId: '<value>', schemaId: '<value>', uuidFunction: '<value>', uuidSeed: '<value>', uuidFunctionTrgmSimilarity: '<value>', uuidSeedTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.uuidModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.uuidModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all uuidModule records

```typescript
const items = await db.uuidModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a uuidModule

```typescript
const item = await db.uuidModule.create({
  data: { databaseId: 'value', schemaId: 'value', uuidFunction: 'value', uuidSeed: 'value', uuidFunctionTrgmSimilarity: 'value', uuidSeedTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
