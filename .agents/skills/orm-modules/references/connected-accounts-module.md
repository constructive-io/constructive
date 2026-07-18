# connectedAccountsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ConnectedAccountsModule records

## Usage

```typescript
db.connectedAccountsModule.findMany({ select: { id: true } }).execute()
db.connectedAccountsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.connectedAccountsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.connectedAccountsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.connectedAccountsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all connectedAccountsModule records

```typescript
const items = await db.connectedAccountsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a connectedAccountsModule

```typescript
const item = await db.connectedAccountsModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
