# emailsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EmailsModule records

## Usage

```typescript
db.emailsModule.findMany({ select: { id: true } }).execute()
db.emailsModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.emailsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.emailsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.emailsModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', ownerTableId: 'value', tableName: 'value', tableNameTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
