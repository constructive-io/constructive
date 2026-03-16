# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Index records

## Usage

```typescript
db.index.findMany({ select: { id: true } }).execute()
db.index.findOne({ id: '<value>', select: { id: true } }).execute()
db.index.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', fieldIds: '<value>', includeFieldIds: '<value>', accessMethod: '<value>', indexParams: '<value>', whereClause: '<value>', isUnique: '<value>', options: '<value>', opClasses: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', accessMethodTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.index.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.index.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all index records

```typescript
const items = await db.index.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a index

```typescript
const item = await db.index.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', fieldIds: 'value', includeFieldIds: 'value', accessMethod: 'value', indexParams: 'value', whereClause: 'value', isUnique: 'value', options: 'value', opClasses: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value', nameTrgmSimilarity: 'value', accessMethodTrgmSimilarity: 'value', moduleTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
