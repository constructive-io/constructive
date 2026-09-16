# databaseFunctionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-node execution state — tracks individual node lifecycle for debugging

## Usage

```typescript
db.databaseFunctionGraphExecutionNodeState.findMany({ select: { id: true } }).execute()
db.databaseFunctionGraphExecutionNodeState.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseFunctionGraphExecutionNodeState.create({ data: { callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', databaseId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', startedAt: '<Datetime>', status: '<String>' }, select: { id: true } }).execute()
db.databaseFunctionGraphExecutionNodeState.update({ where: { id: '<UUID>' }, data: { callbackInputs: '<JSON>' }, select: { id: true } }).execute()
db.databaseFunctionGraphExecutionNodeState.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseFunctionGraphExecutionNodeState records

```typescript
const items = await db.databaseFunctionGraphExecutionNodeState.findMany({
  select: { id: true, callbackInputs: true }
}).execute();
```

### Create a databaseFunctionGraphExecutionNodeState

```typescript
const item = await db.databaseFunctionGraphExecutionNodeState.create({
  data: { callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', databaseId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', startedAt: '<Datetime>', status: '<String>' },
  select: { id: true }
}).execute();
```
