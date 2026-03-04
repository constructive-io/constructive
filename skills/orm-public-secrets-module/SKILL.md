---
name: orm-public-secrets-module
description: ORM operations for SecretsModule records
---

# orm-public-secrets-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SecretsModule records

## Usage

```typescript
db.secretsModule.findMany({ select: { id: true } }).execute()
db.secretsModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.secretsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute()
db.secretsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.secretsModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all secretsModule records

```typescript
const items = await db.secretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a secretsModule

```typescript
const item = await db.secretsModule.create({
  data: { databaseId: 'value', schemaId: 'value', tableId: 'value', tableName: 'value' },
  select: { id: true }
}).execute();
```
