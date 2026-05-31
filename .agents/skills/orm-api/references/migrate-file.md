# migrateFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MigrateFile records

## Usage

```typescript
db.migrateFile.findMany({ select: { id: true } }).execute()
db.migrateFile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.migrateFile.create({ data: { databaseId: '<UUID>', upload: '<Upload>' }, select: { id: true } }).execute()
db.migrateFile.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.migrateFile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all migrateFile records

```typescript
const items = await db.migrateFile.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a migrateFile

```typescript
const item = await db.migrateFile.create({
  data: { databaseId: '<UUID>', upload: '<Upload>' },
  select: { id: true }
}).execute();
```
