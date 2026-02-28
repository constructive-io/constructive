# orm-table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Table records

## Usage

```typescript
db.table.findMany({ select: { id: true } }).execute()
db.table.findOne({ id: '<value>', select: { id: true } }).execute()
db.table.create({ data: { databaseId: '<value>', schemaId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', useRls: '<value>', timestamps: '<value>', peoplestamps: '<value>', pluralName: '<value>', singularName: '<value>', tags: '<value>', inheritsId: '<value>' }, select: { id: true } }).execute()
db.table.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.table.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', name: 'value', label: 'value', description: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', useRls: 'value', timestamps: 'value', peoplestamps: 'value', pluralName: 'value', singularName: 'value', tags: 'value', inheritsId: 'value' },
  select: { id: true }
}).execute();
```
