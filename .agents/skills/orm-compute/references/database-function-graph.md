# databaseFunctionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
db.databaseFunctionGraph.findMany({ select: { id: true } }).execute()
db.databaseFunctionGraph.findOne({ id: '<UUID>', select: { id: true } }).execute()
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
