# enum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Enum records

## Usage

```typescript
db.enum.findMany({ select: { id: true } }).execute()
db.enum.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.enum.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>', values: '<String>' }, select: { id: true } }).execute()
db.enum.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.enum.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all enum records

```typescript
const items = await db.enum.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a enum

```typescript
const item = await db.enum.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', label: '<String>', name: '<String>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>', values: '<String>' },
  select: { id: true }
}).execute();
```
