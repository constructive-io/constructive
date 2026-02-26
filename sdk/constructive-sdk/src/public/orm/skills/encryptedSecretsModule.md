# orm-encryptedSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EncryptedSecretsModule records

## Usage

```typescript
db.encryptedSecretsModule.findMany({ select: { id: true } }).execute()
db.encryptedSecretsModule.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.encryptedSecretsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute()
db.encryptedSecretsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.encryptedSecretsModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all encryptedSecretsModule records

```typescript
const items = await db.encryptedSecretsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a encryptedSecretsModule

```typescript
const item = await db.encryptedSecretsModule.create({
  data: { databaseId: 'value', schemaId: 'value', tableId: 'value', tableName: 'value' },
  select: { id: true }
}).execute();
```
