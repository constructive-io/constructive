# orm-schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SchemaGrant records

## Usage

```typescript
db.schemaGrant.findMany({ select: { id: true } }).execute()
db.schemaGrant.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.schemaGrant.create({ data: { databaseId: '<value>', schemaId: '<value>', granteeName: '<value>' }, select: { id: true } }).execute()
db.schemaGrant.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.schemaGrant.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', granteeName: 'value' },
  select: { id: true }
}).execute();
```
