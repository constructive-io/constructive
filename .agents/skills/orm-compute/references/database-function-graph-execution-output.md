# databaseFunctionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed store for execution outputs — hash-referenced from node_outputs

## Usage

```typescript
db.databaseFunctionGraphExecutionOutput.findMany({ select: { id: true } }).execute()
db.databaseFunctionGraphExecutionOutput.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseFunctionGraphExecutionOutput.create({ data: { data: '<JSON>', databaseId: '<UUID>', hash: '<Base64EncodedBinary>' }, select: { id: true } }).execute()
db.databaseFunctionGraphExecutionOutput.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.databaseFunctionGraphExecutionOutput.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseFunctionGraphExecutionOutput records

```typescript
const items = await db.databaseFunctionGraphExecutionOutput.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a databaseFunctionGraphExecutionOutput

```typescript
const item = await db.databaseFunctionGraphExecutionOutput.create({
  data: { data: '<JSON>', databaseId: '<UUID>', hash: '<Base64EncodedBinary>' },
  select: { id: true }
}).execute();
```
