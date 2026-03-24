# secretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SecretsModule records

## Usage

```typescript
db.secretsModule.findMany({ select: { id: true } }).execute()
db.secretsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.secretsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.secretsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.secretsModule.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
