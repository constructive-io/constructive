# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AstMigration records

## Usage

```typescript
db.astMigration.findMany({ select: { id: true } }).execute()
db.astMigration.findOne({ id: '<value>', select: { id: true } }).execute()
db.astMigration.create({ data: { databaseId: '<value>', name: '<value>', requires: '<value>', payload: '<value>', deploys: '<value>', deploy: '<value>', revert: '<value>', verify: '<value>', action: '<value>', actionId: '<value>', actorId: '<value>' }, select: { id: true } }).execute()
db.astMigration.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.astMigration.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all astMigration records

```typescript
const items = await db.astMigration.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a astMigration

```typescript
const item = await db.astMigration.create({
  data: { databaseId: 'value', name: 'value', requires: 'value', payload: 'value', deploys: 'value', deploy: 'value', revert: 'value', verify: 'value', action: 'value', actionId: 'value', actorId: 'value' },
  select: { id: true }
}).execute();
```
