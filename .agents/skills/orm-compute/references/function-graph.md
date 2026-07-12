# functionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store

## Usage

```typescript
db.functionGraph.findMany({ select: { id: true } }).execute()
db.functionGraph.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraph.create({ data: { scopeId: '<UUID>', storeId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' }, select: { id: true } }).execute()
db.functionGraph.update({ where: { id: '<UUID>' }, data: { scopeId: '<UUID>' }, select: { id: true } }).execute()
db.functionGraph.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraph records

```typescript
const items = await db.functionGraph.findMany({
  select: { id: true, scopeId: true }
}).execute();
```

### Create a functionGraph

```typescript
const item = await db.functionGraph.create({
  data: { scopeId: '<UUID>', storeId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' },
  select: { id: true }
}).execute();
```
