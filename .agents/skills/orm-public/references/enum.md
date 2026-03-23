# enum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Enum records

## Usage

```typescript
db.enum.findMany({ select: { id: true } }).execute()
db.enum.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.enum.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', values: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.enum.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.enum.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all enum records

```typescript
const items = await db.enum.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a enum

```typescript
const item = await db.enum.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', values: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
