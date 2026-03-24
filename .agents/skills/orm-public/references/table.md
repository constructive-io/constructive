# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Table records

## Usage

```typescript
db.table.findMany({ select: { id: true } }).execute()
db.table.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.table.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', inheritsId: '<UUID>' }, select: { id: true } }).execute()
db.table.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.table.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all table records

```typescript
const items = await db.table.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a table

```typescript
const item = await db.table.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', inheritsId: '<UUID>' },
  select: { id: true }
}).execute();
```
