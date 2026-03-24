# connectedAccountsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ConnectedAccountsModule records

## Usage

```typescript
db.connectedAccountsModule.findMany({ select: { id: true } }).execute()
db.connectedAccountsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.connectedAccountsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.connectedAccountsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.connectedAccountsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all connectedAccountsModule records

```typescript
const items = await db.connectedAccountsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a connectedAccountsModule

```typescript
const item = await db.connectedAccountsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
