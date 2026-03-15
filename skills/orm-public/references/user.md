# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for User records

## Usage

```typescript
db.user.findMany({ select: { id: true } }).execute()
db.user.findOne({ id: '<value>', select: { id: true } }).execute()
db.user.create({ data: { username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>', displayNameTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.user.update({ where: { id: '<value>' }, data: { username: '<new>' }, select: { id: true } }).execute()
db.user.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all user records

```typescript
const items = await db.user.findMany({
  select: { id: true, username: true }
}).execute();
```

### Create a user

```typescript
const item = await db.user.create({
  data: { username: 'value', displayName: 'value', profilePicture: 'value', searchTsv: 'value', type: 'value', searchTsvRank: 'value', displayNameTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
