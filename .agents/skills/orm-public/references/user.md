# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for User records

## Usage

```typescript
db.user.findMany({ select: { id: true } }).execute()
db.user.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.user.create({ data: { username: '<String>', displayName: '<String>', profilePicture: '<Image>', searchTsv: '<FullText>', type: '<Int>', searchTsvRank: '<Float>', displayNameTrgmSimilarity: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.user.update({ where: { id: '<UUID>' }, data: { username: '<String>' }, select: { id: true } }).execute()
db.user.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { username: '<String>', displayName: '<String>', profilePicture: '<Image>', searchTsv: '<FullText>', type: '<Int>', searchTsvRank: '<Float>', displayNameTrgmSimilarity: '<Float>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
