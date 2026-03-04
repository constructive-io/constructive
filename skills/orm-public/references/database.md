# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Database records

## Usage

```typescript
db.database.findMany({ select: { id: true } }).execute()
db.database.findOne({ id: '<value>', select: { id: true } }).execute()
db.database.create({ data: { ownerId: '<value>', schemaHash: '<value>', name: '<value>', label: '<value>', hash: '<value>' }, select: { id: true } }).execute()
db.database.update({ where: { id: '<value>' }, data: { ownerId: '<new>' }, select: { id: true } }).execute()
db.database.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all database records

```typescript
const items = await db.database.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a database

```typescript
const item = await db.database.create({
  data: { ownerId: 'value', schemaHash: 'value', name: 'value', label: 'value', hash: 'value' },
  select: { id: true }
}).execute();
```
