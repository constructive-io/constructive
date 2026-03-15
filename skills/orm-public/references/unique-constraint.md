# uniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UniqueConstraint records

## Usage

```typescript
db.uniqueConstraint.findMany({ select: { id: true } }).execute()
db.uniqueConstraint.findOne({ id: '<value>', select: { id: true } }).execute()
db.uniqueConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', typeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.uniqueConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.uniqueConstraint.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all uniqueConstraint records

```typescript
const items = await db.uniqueConstraint.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a uniqueConstraint

```typescript
const item = await db.uniqueConstraint.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', description: 'value', smartTags: 'value', type: 'value', fieldIds: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value', nameTrgmSimilarity: 'value', descriptionTrgmSimilarity: 'value', typeTrgmSimilarity: 'value', moduleTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
