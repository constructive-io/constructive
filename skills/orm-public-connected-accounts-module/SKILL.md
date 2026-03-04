---
name: orm-public-connected-accounts-module
description: ORM operations for ConnectedAccountsModule records
---

# orm-public-connected-accounts-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ConnectedAccountsModule records

## Usage

```typescript
db.connectedAccountsModule.findMany({ select: { id: true } }).execute()
db.connectedAccountsModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.connectedAccountsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute()
db.connectedAccountsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.connectedAccountsModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', ownerTableId: 'value', tableName: 'value' },
  select: { id: true }
}).execute();
```
