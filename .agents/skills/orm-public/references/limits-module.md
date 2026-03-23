# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for LimitsModule records

## Usage

```typescript
db.limitsModule.findMany({ select: { id: true } }).execute()
db.limitsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.limitsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' }, select: { id: true } }).execute()
db.limitsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.limitsModule.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', defaultTableId: '<UUID>', defaultTableName: '<String>', limitIncrementFunction: '<String>', limitDecrementFunction: '<String>', limitIncrementTrigger: '<String>', limitDecrementTrigger: '<String>', limitUpdateTrigger: '<String>', limitCheckFunction: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
