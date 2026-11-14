# listSuspendedDatabasesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ListSuspendedDatabasesRecord records

## Usage

```typescript
db.listSuspendedDatabasesRecord.findMany({ select: { id: true } }).execute()
db.listSuspendedDatabasesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.listSuspendedDatabasesRecord.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.listSuspendedDatabasesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all listSuspendedDatabasesRecord records

```typescript
const items = await db.listSuspendedDatabasesRecord.findMany({
  select: { id: true, name: true }
}).execute();
```
