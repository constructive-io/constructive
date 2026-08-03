# foreignKeyConstraintBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ForeignKeyConstraintBehavior records

## Usage

```typescript
db.foreignKeyConstraintBehavior.findMany({ select: { id: true } }).execute()
db.foreignKeyConstraintBehavior.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.foreignKeyConstraintBehavior.create({ data: { databaseId: '<UUID>', foreignKeyConstraintId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>' }, select: { id: true } }).execute()
db.foreignKeyConstraintBehavior.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.foreignKeyConstraintBehavior.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all foreignKeyConstraintBehavior records

```typescript
const items = await db.foreignKeyConstraintBehavior.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a foreignKeyConstraintBehavior

```typescript
const item = await db.foreignKeyConstraintBehavior.create({
  data: { databaseId: '<UUID>', foreignKeyConstraintId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>' },
  select: { id: true }
}).execute();
```
