# defaultIdsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DefaultIdsModule records

## Usage

```typescript
db.defaultIdsModule.findMany({ select: { id: true } }).execute()
db.defaultIdsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.defaultIdsModule.create({ data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.defaultIdsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.defaultIdsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all defaultIdsModule records

```typescript
const items = await db.defaultIdsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a defaultIdsModule

```typescript
const item = await db.defaultIdsModule.create({
  data: { databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
