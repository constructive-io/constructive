# orm-limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for LimitsModule records

## Usage

```typescript
db.limitsModule.findMany({ select: { id: true } }).execute()
db.limitsModule.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.limitsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', defaultTableId: '<value>', defaultTableName: '<value>', limitIncrementFunction: '<value>', limitDecrementFunction: '<value>', limitIncrementTrigger: '<value>', limitDecrementTrigger: '<value>', limitUpdateTrigger: '<value>', limitCheckFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' }, select: { id: true } }).execute()
db.limitsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.limitsModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all limitsModule records

```typescript
const items = await db.limitsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a limitsModule

```typescript
const item = await db.limitsModule.create({
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', tableName: 'value', defaultTableId: 'value', defaultTableName: 'value', limitIncrementFunction: 'value', limitDecrementFunction: 'value', limitIncrementTrigger: 'value', limitDecrementTrigger: 'value', limitUpdateTrigger: 'value', limitCheckFunction: 'value', prefix: 'value', membershipType: 'value', entityTableId: 'value', actorTableId: 'value' },
  select: { id: true }
}).execute();
```
