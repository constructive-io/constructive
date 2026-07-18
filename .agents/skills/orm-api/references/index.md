# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Index records

## Usage

```typescript
db.index.findMany({ select: { id: true } }).execute()
db.index.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.index.create({ data: { accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', indexParams: '<JSON>', isUnique: '<Boolean>', name: '<String>', opClasses: '<String>', options: '<JSON>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', whereClause: '<JSON>' }, select: { id: true } }).execute()
db.index.update({ where: { id: '<UUID>' }, data: { accessMethod: '<String>' }, select: { id: true } }).execute()
db.index.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all index records

```typescript
const items = await db.index.findMany({
  select: { id: true, accessMethod: true }
}).execute();
```

### Create a index

```typescript
const item = await db.index.create({
  data: { accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', includeFieldIds: '<UUID>', indexParams: '<JSON>', isUnique: '<Boolean>', name: '<String>', opClasses: '<String>', options: '<JSON>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', whereClause: '<JSON>' },
  select: { id: true }
}).execute();
```
