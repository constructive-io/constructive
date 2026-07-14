# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Database records

## Usage

```typescript
db.database.findMany({ select: { id: true } }).execute()
db.database.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.database.create({ data: { hash: '<UUID>', label: '<String>', name: '<String>', ownerId: '<UUID>', platform: '<Boolean>', schemaHash: '<String>' }, select: { id: true } }).execute()
db.database.update({ where: { id: '<UUID>' }, data: { hash: '<UUID>' }, select: { id: true } }).execute()
db.database.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all database records

```typescript
const items = await db.database.findMany({
  select: { id: true, hash: true }
}).execute();
```

### Create a database

```typescript
const item = await db.database.create({
  data: { hash: '<UUID>', label: '<String>', name: '<String>', ownerId: '<UUID>', platform: '<Boolean>', schemaHash: '<String>' },
  select: { id: true }
}).execute();
```
