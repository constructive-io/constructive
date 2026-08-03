# fieldBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FieldBehavior records

## Usage

```typescript
db.fieldBehavior.findMany({ select: { id: true } }).execute()
db.fieldBehavior.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.fieldBehavior.create({ data: { databaseId: '<UUID>', fieldId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>' }, select: { id: true } }).execute()
db.fieldBehavior.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.fieldBehavior.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all fieldBehavior records

```typescript
const items = await db.fieldBehavior.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a fieldBehavior

```typescript
const item = await db.fieldBehavior.create({
  data: { databaseId: '<UUID>', fieldId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>' },
  select: { id: true }
}).execute();
```
