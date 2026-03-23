# fullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FullTextSearch records

## Usage

```typescript
db.fullTextSearch.findMany({ select: { id: true } }).execute()
db.fullTextSearch.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.fullTextSearch.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>' }, select: { id: true } }).execute()
db.fullTextSearch.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.fullTextSearch.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all fullTextSearch records

```typescript
const items = await db.fullTextSearch.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a fullTextSearch

```typescript
const item = await db.fullTextSearch.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', fieldIds: '<UUID>', weights: '<String>', langs: '<String>' },
  select: { id: true }
}).execute();
```
