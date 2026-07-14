# compositeType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CompositeType records

## Usage

```typescript
db.compositeType.findMany({ select: { id: true } }).execute()
db.compositeType.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.compositeType.create({ data: { attributes: '<JSON>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' }, select: { id: true } }).execute()
db.compositeType.update({ where: { id: '<UUID>' }, data: { attributes: '<JSON>' }, select: { id: true } }).execute()
db.compositeType.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all compositeType records

```typescript
const items = await db.compositeType.findMany({
  select: { id: true, attributes: true }
}).execute();
```

### Create a compositeType

```typescript
const item = await db.compositeType.create({
  data: { attributes: '<JSON>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' },
  select: { id: true }
}).execute();
```
