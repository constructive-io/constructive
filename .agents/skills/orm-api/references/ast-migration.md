# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AstMigration records

## Usage

```typescript
db.astMigration.findMany({ select: { id: true } }).execute()
db.astMigration.findOne({ id: '<Int>', select: { id: true } }).execute()
db.astMigration.update({ where: { id: '<Int>' }, data: { actionId: '<UUID>' }, select: { id: true } }).execute()
db.astMigration.delete({ where: { id: '<Int>' } }).execute()
```

## Examples

### List all astMigration records

```typescript
const items = await db.astMigration.findMany({
  select: { id: true, actionId: true }
}).execute();
```
