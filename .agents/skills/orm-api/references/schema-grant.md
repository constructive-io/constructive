# schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SchemaGrant records

## Usage

```typescript
db.schemaGrant.findMany({ select: { id: true } }).execute()
db.schemaGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.schemaGrant.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', granteeName: '<String>' }, select: { id: true } }).execute()
db.schemaGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.schemaGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all schemaGrant records

```typescript
const items = await db.schemaGrant.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a schemaGrant

```typescript
const item = await db.schemaGrant.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', granteeName: '<String>' },
  select: { id: true }
}).execute();
```
