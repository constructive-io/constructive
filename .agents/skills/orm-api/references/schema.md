# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Schema records

## Usage

```typescript
db.schema.findMany({ select: { id: true } }).execute()
db.schema.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.schema.create({ data: { databaseId: '<UUID>', name: '<String>', schemaName: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>', isPublic: '<Boolean>' }, select: { id: true } }).execute()
db.schema.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.schema.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all schema records

```typescript
const items = await db.schema.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a schema

```typescript
const item = await db.schema.create({
  data: { databaseId: '<UUID>', name: '<String>', schemaName: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>', isPublic: '<Boolean>' },
  select: { id: true }
}).execute();
```
