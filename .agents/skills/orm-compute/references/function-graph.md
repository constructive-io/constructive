# functionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
db.functionGraph.findMany({ select: { id: true } }).execute()
db.functionGraph.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraph.create({ data: { context: '<String>', createdBy: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', validationErrors: '<JSON>' }, select: { id: true } }).execute()
db.functionGraph.update({ where: { id: '<UUID>' }, data: { context: '<String>' }, select: { id: true } }).execute()
db.functionGraph.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraph records

```typescript
const items = await db.functionGraph.findMany({
  select: { id: true, context: true }
}).execute();
```

### Create a functionGraph

```typescript
const item = await db.functionGraph.create({
  data: { context: '<String>', createdBy: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', validationErrors: '<JSON>' },
  select: { id: true }
}).execute();
```
