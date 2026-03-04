---
name: orm-public-rls-module
description: ORM operations for RlsModule records
---

# orm-public-rls-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RlsModule records

## Usage

```typescript
db.rlsModule.findMany({ select: { id: true } }).execute()
db.rlsModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.rlsModule.create({ data: { databaseId: '<value>', apiId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', sessionCredentialsTableId: '<value>', sessionsTableId: '<value>', usersTableId: '<value>', authenticate: '<value>', authenticateStrict: '<value>', currentRole: '<value>', currentRoleId: '<value>' }, select: { id: true } }).execute()
db.rlsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.rlsModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all rlsModule records

```typescript
const items = await db.rlsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a rlsModule

```typescript
const item = await db.rlsModule.create({
  data: { databaseId: 'value', apiId: 'value', schemaId: 'value', privateSchemaId: 'value', sessionCredentialsTableId: 'value', sessionsTableId: 'value', usersTableId: 'value', authenticate: 'value', authenticateStrict: 'value', currentRole: 'value', currentRoleId: 'value' },
  select: { id: true }
}).execute();
```
