# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AstMigration records

## Usage

```typescript
db.astMigration.findMany({ select: { id: true } }).execute()
db.astMigration.findOne({ id: '<Int>', select: { id: true } }).execute()
db.astMigration.create({ data: { action: '<String>', actionId: '<UUID>', actorId: '<UUID>', databaseId: '<UUID>', deploy: '<JSON>', deploys: '<String>', name: '<String>', payload: '<JSON>', requires: '<String>', revert: '<JSON>', verify: '<JSON>' }, select: { id: true } }).execute()
db.astMigration.update({ where: { id: '<Int>' }, data: { action: '<String>' }, select: { id: true } }).execute()
db.astMigration.delete({ where: { id: '<Int>' } }).execute()
```

## Examples

### List all astMigration records

```typescript
const items = await db.astMigration.findMany({
  select: { id: true, action: true }
}).execute();
```

### Create a astMigration

```typescript
const item = await db.astMigration.create({
  data: { action: '<String>', actionId: '<UUID>', actorId: '<UUID>', databaseId: '<UUID>', deploy: '<JSON>', deploys: '<String>', name: '<String>', payload: '<JSON>', requires: '<String>', revert: '<JSON>', verify: '<JSON>' },
  select: { id: true }
}).execute();
```
