# sqlMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SqlMigration records

## Usage

```typescript
db.sqlMigration.findMany({ select: { id: true } }).execute()
db.sqlMigration.findOne({ id: '<Int>', select: { id: true } }).execute()
db.sqlMigration.create({ data: { name: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', payload: '<JSON>', content: '<String>', revert: '<String>', verify: '<String>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' }, select: { id: true } }).execute()
db.sqlMigration.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.sqlMigration.delete({ where: { id: '<Int>' } }).execute()
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
  data: { name: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', payload: '<JSON>', content: '<String>', revert: '<String>', verify: '<String>', action: '<String>', actionId: '<UUID>', actorId: '<UUID>' },
  select: { id: true }
}).execute();
```
