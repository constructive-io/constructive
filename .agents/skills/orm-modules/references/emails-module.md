# emailsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EmailsModule records

## Usage

```typescript
db.emailsModule.findMany({ select: { id: true } }).execute()
db.emailsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.emailsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.emailsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.emailsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all emailsModule records

```typescript
const items = await db.emailsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a emailsModule

```typescript
const item = await db.emailsModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
