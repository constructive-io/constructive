# orm-schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Schema records

## Usage

```typescript
db.schema.findMany({ select: { id: true } }).execute()
db.schema.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.schema.create({ data: { databaseId: '<value>', name: '<value>', schemaName: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', isPublic: '<value>' }, select: { id: true } }).execute()
db.schema.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.schema.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', name: 'value', schemaName: 'value', label: 'value', description: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value', isPublic: 'value' },
  select: { id: true }
}).execute();
```
