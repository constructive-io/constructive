# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Index records

## Usage

```typescript
db.index.findMany({ select: { id: true } }).execute()
db.index.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.index.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', accessMethod: '<String>', indexParams: '<JSON>', whereClause: '<JSON>', isUnique: '<Boolean>', options: '<JSON>', opClasses: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.index.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.index.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', accessMethod: '<String>', indexParams: '<JSON>', whereClause: '<JSON>', isUnique: '<Boolean>', options: '<JSON>', opClasses: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
