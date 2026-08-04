# uniqueConstraintBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UniqueConstraintBehavior records

## Usage

```typescript
db.uniqueConstraintBehavior.findMany({ select: { id: true } }).execute()
db.uniqueConstraintBehavior.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.uniqueConstraintBehavior.create({ data: { databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', uniqueConstraintId: '<UUID>' }, select: { id: true } }).execute()
db.uniqueConstraintBehavior.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.uniqueConstraintBehavior.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all uniqueConstraintBehavior records

```typescript
const items = await db.uniqueConstraintBehavior.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a uniqueConstraintBehavior

```typescript
const item = await db.uniqueConstraintBehavior.create({
  data: { databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', uniqueConstraintId: '<UUID>' },
  select: { id: true }
}).execute();
```
