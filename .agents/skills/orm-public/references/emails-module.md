# emailsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EmailsModule records

## Usage

```typescript
db.emailsModule.findMany({ select: { id: true } }).execute()
db.emailsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.emailsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.emailsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.emailsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all emailsModule records

```typescript
const items = await db.emailsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a emailsModule

```typescript
const item = await db.emailsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
