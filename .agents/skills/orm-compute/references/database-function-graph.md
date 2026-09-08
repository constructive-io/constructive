# databaseFunctionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
db.databaseFunctionGraph.findMany({ select: { id: true } }).execute()
db.databaseFunctionGraph.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseFunctionGraph.create({ data: { context: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', storeId: '<UUID>', validationErrors: '<JSON>' }, select: { id: true } }).execute()
db.databaseFunctionGraph.update({ where: { id: '<UUID>' }, data: { context: '<String>' }, select: { id: true } }).execute()
db.databaseFunctionGraph.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseFunctionGraph records

```typescript
const items = await db.databaseFunctionGraph.findMany({
  select: { id: true, context: true }
}).execute();
```

### Create a databaseFunctionGraph

```typescript
const item = await db.databaseFunctionGraph.create({
  data: { context: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', storeId: '<UUID>', validationErrors: '<JSON>' },
  select: { id: true }
}).execute();
```
