# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Table records

## Usage

```typescript
db.table.findMany({ select: { id: true } }).execute()
db.table.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.table.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', inheritsId: '<UUID>', label: '<String>', name: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', partitionStrategy: '<String>', partitioned: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', schemaId: '<UUID>', singularName: '<String>', smartTags: '<JSON>', stepUp: '<JSON>', tags: '<String>', timestamps: '<Boolean>', useRls: '<Boolean>' }, select: { id: true } }).execute()
db.table.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.table.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all table records

```typescript
const items = await db.table.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a table

```typescript
const item = await db.table.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', inheritsId: '<UUID>', label: '<String>', name: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', partitionStrategy: '<String>', partitioned: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', schemaId: '<UUID>', singularName: '<String>', smartTags: '<JSON>', stepUp: '<JSON>', tags: '<String>', timestamps: '<Boolean>', useRls: '<Boolean>' },
  select: { id: true }
}).execute();
```
