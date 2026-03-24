# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AstMigration records

## Usage

```typescript
db.astMigration.findMany({ select: { id: true } }).execute()
db.astMigration.findOne({ id: '<Int>', select: { id: true } }).execute()
db.astMigration.create({ data: { databaseId: '<UUID>', name: '<String>', requires: '<String>', payload: '<JSON>', deploys: '<String>', deploy: '<JSON>', revert: '<JSON>', verify: '<JSON>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' }, select: { id: true } }).execute()
db.astMigration.update({ where: { id: '<Int>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.astMigration.delete({ where: { id: '<Int>' } }).execute()
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
  data: { databaseId: '<UUID>', name: '<String>', requires: '<String>', payload: '<JSON>', deploys: '<String>', deploy: '<JSON>', revert: '<JSON>', verify: '<JSON>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' },
  select: { id: true }
}).execute();
```
