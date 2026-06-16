# compositeType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CompositeType records

## Usage

```typescript
db.compositeType.findMany({ select: { id: true } }).execute()
db.compositeType.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.compositeType.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', attributes: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.compositeType.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.compositeType.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all compositeType records

```typescript
const items = await db.compositeType.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a compositeType

```typescript
const item = await db.compositeType.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', attributes: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
