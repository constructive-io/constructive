# usersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UsersModule records

## Usage

```typescript
db.usersModule.findMany({ select: { id: true } }).execute()
db.usersModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.usersModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', typeTableId: '<value>', typeTableName: '<value>', tableNameTrgmSimilarity: '<value>', typeTableNameTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.usersModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.usersModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all usersModule records

```typescript
const items = await db.usersModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a usersModule

```typescript
const item = await db.usersModule.create({
  data: { databaseId: 'value', schemaId: 'value', tableId: 'value', tableName: 'value', typeTableId: 'value', typeTableName: 'value', tableNameTrgmSimilarity: 'value', typeTableNameTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
