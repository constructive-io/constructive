# sqlMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SqlMigration records

## Usage

```typescript
db.sqlMigration.findMany({ select: { id: true } }).execute()
db.sqlMigration.findOne({ id: '<value>', select: { id: true } }).execute()
db.sqlMigration.create({ data: { name: '<value>', databaseId: '<value>', deploy: '<value>', deps: '<value>', payload: '<value>', content: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' }, select: { id: true } }).execute()
db.sqlMigration.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.sqlMigration.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all sqlMigration records

```typescript
const items = await db.sqlMigration.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a sqlMigration

```typescript
const item = await db.sqlMigration.create({
  data: { name: 'value', databaseId: 'value', deploy: 'value', deps: 'value', payload: 'value', content: 'value', revert: 'value', verify: 'value', action: 'value', actionId: 'value', actorId: 'value' },
  select: { id: true }
}).execute();
```
