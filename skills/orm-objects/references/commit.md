# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A commit records changes to the repository.

## Usage

```typescript
db.commit.findMany({ select: { id: true } }).execute()
db.commit.findOne({ id: '<value>', select: { id: true } }).execute()
db.commit.create({ data: { message: '<value>', databaseId: '<value>', storeId: '<value>', parentIds: '<value>', authorId: '<value>', committerId: '<value>', treeId: '<value>', date: '<value>' }, select: { id: true } }).execute()
db.commit.update({ where: { id: '<value>' }, data: { message: '<new>' }, select: { id: true } }).execute()
db.commit.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all commit records

```typescript
const items = await db.commit.findMany({
  select: { id: true, message: true }
}).execute();
```

### Create a commit

```typescript
const item = await db.commit.create({
  data: { message: 'value', databaseId: 'value', storeId: 'value', parentIds: 'value', authorId: 'value', committerId: 'value', treeId: 'value', date: 'value' },
  select: { id: true }
}).execute();
```
